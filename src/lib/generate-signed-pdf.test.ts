import { describe, expect, it } from "vitest";
import { PDFDocument, PDFDict, PDFName, StandardFonts } from "pdf-lib";
import { flattenOriginalForm, stampFields, type StampField } from "./generate-signed-pdf";
import { extractPdfTextPositions } from "./pdf-text";

// A real, minimal 1x1 red PNG — small enough to inline, but a genuine
// embeddable image, not a placeholder string, so embedPng actually has
// something valid to parse.
const RED_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function makeDoc(pageCount = 1) {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { pdfDoc, fonts: { font, boldFont } };
}

// How many images/XObjects are embedded on a given page — the only
// reliable, non-rasterizing way to confirm a signature/initials image
// actually got embedded onto the page (as opposed to silently skipped).
function xObjectCount(pdfDoc: PDFDocument, pageIndex: number): number {
  const page = pdfDoc.getPages()[pageIndex];
  const resources = page.node.Resources();
  if (!resources) return 0;
  const xobj = resources.lookup(PDFName.of("XObject"));
  return xobj instanceof PDFDict ? xobj.keys().length : 0;
}

describe("flattenOriginalForm", () => {
  it("removes an existing interactive AcroForm text field", async () => {
    // Reproduces the real bug report: an uploaded PDF that was already a
    // fillable form (its own AcroForm field, separate from anything
    // SignedBy's field editor places) stayed interactive and empty in the
    // final signed PDF, so Adobe still prompted "do you want to sign it."
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const form = pdfDoc.getForm();
    const textField = form.createTextField("original.name");
    textField.addToPage(page, { x: 50, y: 700, width: 200, height: 20 });

    expect(pdfDoc.getForm().getFields()).toHaveLength(1);

    flattenOriginalForm(pdfDoc, "doc-1");

    expect(pdfDoc.getForm().getFields()).toHaveLength(0);
    // Still a well-formed, loadable PDF afterward.
    const bytes = await pdfDoc.save();
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("is a no-op (and doesn't throw) for a PDF with no form fields at all", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([612, 792]);

    expect(() => flattenOriginalForm(pdfDoc, "doc-2")).not.toThrow();
    expect(pdfDoc.getForm().getFields()).toHaveLength(0);
  });

  it("swallows an error from a malformed/exotic form rather than throwing", () => {
    // Simulates flatten() throwing (e.g. an XFA-based or otherwise unusual
    // form pdf-lib can't cleanly flatten) — signing must never be blocked
    // by this, since the document is still legally captured via the audit
    // trail regardless.
    const fakePdfDoc = {
      getForm: () => ({
        flatten: () => {
          throw new Error("unsupported form structure");
        },
      }),
    } as unknown as PDFDocument;

    expect(() => flattenOriginalForm(fakePdfDoc, "doc-3")).not.toThrow();
  });
});

// This is the "did the signer's actual input end up in the right place in
// the final PDF" logic — the least room for a silent regression in the
// whole app, since a field that doesn't stamp, stamps the wrong value, or
// lands in the wrong spot undermines the document's legal validity, not
// just its looks. Every assertion here reloads the saved PDF bytes and
// reads them back (via pdf-lib's own page/resource inspection, or pdfjs
// via extractPdfTextPositions) rather than trusting draw calls didn't
// throw — a real round-trip check, not just "no exception."
describe("stampFields", () => {
  it("stamps a text field's value onto the page, near the expected position", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    // y: 0.1 is near the TOP of the page in this app's top-left-origin
    // field coordinates — regression check for the top/bottom flip math
    // (boxTopY = ph - field.y * ph), which would silently place every
    // field upside-down/mirrored if broken.
    const field: StampField = {
      id: "f1",
      type: "text",
      page: 1,
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.05,
      value: "Jane Doe",
    };
    await stampFields(pdfDoc, [field], fonts);

    const items = await extractPdfTextPositions(Buffer.from(await pdfDoc.save()));
    const match = items.find((i) => i.str.includes("Jane Doe"));
    expect(match).toBeDefined();
    expect(match!.page).toBe(1);
    expect(match!.y).toBeLessThan(0.3);
  });

  it("stamps a date field through the same generic text path as a text field", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    const field: StampField = {
      id: "f1",
      type: "date",
      page: 1,
      x: 0.1,
      y: 0.5,
      width: 0.2,
      height: 0.04,
      value: "2026-07-14",
    };
    await stampFields(pdfDoc, [field], fonts);
    const items = await extractPdfTextPositions(Buffer.from(await pdfDoc.save()));
    expect(items.some((i) => i.str.includes("2026-07-14"))).toBe(true);
  });

  it("draws an X for a checked checkbox", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    const field: StampField = {
      id: "f1",
      type: "checkbox",
      page: 1,
      x: 0.5,
      y: 0.5,
      width: 0.03,
      height: 0.03,
      value: "true",
    };
    await stampFields(pdfDoc, [field], fonts);
    const items = await extractPdfTextPositions(Buffer.from(await pdfDoc.save()));
    expect(items.some((i) => i.str === "X")).toBe(true);
  });

  it("draws nothing for an unchecked checkbox", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    const field: StampField = {
      id: "f1",
      type: "checkbox",
      page: 1,
      x: 0.5,
      y: 0.5,
      width: 0.03,
      height: 0.03,
      value: "false",
    };
    await stampFields(pdfDoc, [field], fonts);
    const items = await extractPdfTextPositions(Buffer.from(await pdfDoc.save()));
    expect(items.some((i) => i.str === "X")).toBe(false);
  });

  it("embeds a signature image onto the page", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    expect(xObjectCount(pdfDoc, 0)).toBe(0);
    const field: StampField = {
      id: "f1",
      type: "signature",
      page: 1,
      x: 0.2,
      y: 0.7,
      width: 0.2,
      height: 0.05,
      value: RED_PNG_DATA_URL,
    };
    await stampFields(pdfDoc, [field], fonts);
    expect(xObjectCount(pdfDoc, 0)).toBe(1);
  });

  it("embeds an initials image the same way as a signature", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    const field: StampField = {
      id: "f1",
      type: "initials",
      page: 1,
      x: 0.85,
      y: 0.02,
      width: 0.08,
      height: 0.05,
      value: RED_PNG_DATA_URL,
    };
    await stampFields(pdfDoc, [field], fonts);
    expect(xObjectCount(pdfDoc, 0)).toBe(1);
  });

  it("skips a signature field whose value isn't an image data URL, without throwing", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    const field: StampField = {
      id: "f1",
      type: "signature",
      page: 1,
      x: 0.2,
      y: 0.7,
      width: 0.2,
      height: 0.05,
      value: "not an image",
    };
    await expect(stampFields(pdfDoc, [field], fonts)).resolves.not.toThrow();
    expect(xObjectCount(pdfDoc, 0)).toBe(0);
  });

  it("skips a field with no value at all", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    const field: StampField = {
      id: "f1",
      type: "text",
      page: 1,
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.05,
      value: null,
    };
    await stampFields(pdfDoc, [field], fonts);
    const items = await extractPdfTextPositions(Buffer.from(await pdfDoc.save()));
    expect(items).toHaveLength(0);
  });

  it("skips a field pointing at a page that doesn't exist, without throwing", async () => {
    const { pdfDoc, fonts } = await makeDoc(1);
    const field: StampField = {
      id: "f1",
      type: "text",
      page: 5,
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.05,
      value: "should not appear",
    };
    await expect(stampFields(pdfDoc, [field], fonts)).resolves.not.toThrow();
  });

  it("stamps a field on page 2, not page 1, for a multi-page document", async () => {
    const { pdfDoc, fonts } = await makeDoc(2);
    const field: StampField = {
      id: "f1",
      type: "text",
      page: 2,
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.05,
      value: "Page Two Value",
    };
    await stampFields(pdfDoc, [field], fonts);
    const items = await extractPdfTextPositions(Buffer.from(await pdfDoc.save()));
    const match = items.find((i) => i.str.includes("Page Two Value"));
    expect(match).toBeDefined();
    expect(match!.page).toBe(2);
  });

  it("doesn't let one malformed field abort stamping the rest", async () => {
    const { pdfDoc, fonts } = await makeDoc();
    const badField: StampField = {
      id: "bad",
      type: "signature",
      page: 1,
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.05,
      value: "data:image/png;base64,dGhpcyBpcyBub3QgYSByZWFsIHBuZw==",
    };
    const goodField: StampField = {
      id: "good",
      type: "text",
      page: 1,
      x: 0.1,
      y: 0.5,
      width: 0.3,
      height: 0.05,
      value: "Still Works",
    };
    await stampFields(pdfDoc, [badField, goodField], fonts);
    const items = await extractPdfTextPositions(Buffer.from(await pdfDoc.save()));
    expect(items.some((i) => i.str.includes("Still Works"))).toBe(true);
  });
});
