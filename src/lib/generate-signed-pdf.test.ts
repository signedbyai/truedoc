import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { flattenOriginalForm } from "./generate-signed-pdf";

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
