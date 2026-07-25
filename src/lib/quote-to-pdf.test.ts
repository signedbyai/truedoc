import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { quoteToPdf, type QuoteRenderInput } from "./quote-to-pdf";
import { computeQuoteTotals } from "./quote-types";
import { extractPdfTextPositions } from "./pdf-text";

// Real (unmocked) PDF round-trips, same convention as
// generate-signed-pdf.test.ts's stampFields tests — reads the actual saved
// bytes back via pdf-lib/pdfjs rather than trusting draw calls didn't throw.
function baseInput(overrides: Partial<QuoteRenderInput> = {}): QuoteRenderInput {
  const totals = computeQuoteTotals([{ description: "Consulting", quantity: 1, unitPrice: 500 }], 0);
  return {
    title: "Test Quote",
    currency: "$",
    fromName: "Acme Co",
    preparedByName: null,
    billToName: "",
    billToEmail: null,
    quoteDateIso: "2026-07-25T00:00:00.000Z",
    validUntilIso: null,
    notes: null,
    totals,
    language: "en",
    ...overrides,
  };
}

describe("quoteToPdf", () => {
  it("produces a valid, loadable PDF", async () => {
    const result = await quoteToPdf(baseInput());
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.bytes.length).toBeGreaterThan(0);
    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(result.pageCount);
  });

  // Regression test for 2026-07-25: on a blank (no bill-to name yet) quote,
  // Spanish's and French's longer "Print Name:" translation used to leave
  // only ROW_LINE_HEIGHT (14px, ~0.018 of the 792px page) below the label
  // instead of SIGNATURE_LINE_HEIGHT (38px, ~0.048) — not enough room for a
  // suggested field to sit on that line without risking overlap with the
  // Date line below it. See quote-to-pdf.ts's signature-block loop and
  // text-to-pdf.test.ts's isFieldLabelLine tests for the underlying cause.
  it.each([
    ["es", "Fecha:"],
    ["fr", "Date :"],
    ["nl", "Datum:"],
    ["de", "Datum:"],
  ])("leaves signature-block spacing room for a blank Print Name line (%s)", async (language, dateLabel) => {
    const result = await quoteToPdf(baseInput({ language, billToName: "" }));
    const items = await extractPdfTextPositions(result.bytes);

    const printNameItem = items.find((i) => i.str.includes(":") && /name|nom|naam/i.test(i.str));
    const dateItem = items.find((i) => i.str === dateLabel);
    expect(printNameItem, `no Print Name line found for ${language}`).toBeDefined();
    expect(dateItem, `no Date line found for ${language}`).toBeDefined();

    // y is a 0-1 fraction of page height, top-left origin, so the Date line
    // (further down the page) has a strictly larger y. The gap between them
    // must be closer to SIGNATURE_LINE_HEIGHT/792 (~0.048) than
    // ROW_LINE_HEIGHT/792 (~0.018) -- 0.03 sits comfortably between the two.
    const gap = dateItem!.y - printNameItem!.y;
    expect(gap, `${language} gap was ${gap}, expected >= ~0.03 (SIGNATURE_LINE_HEIGHT, not ROW_LINE_HEIGHT)`).toBeGreaterThan(
      0.03
    );
  });

  it("still renders correctly when a bill-to name IS present (the already-covered case)", async () => {
    const result = await quoteToPdf(baseInput({ language: "es", billToName: "Carlos Ruiz" }));
    const items = await extractPdfTextPositions(result.bytes);
    expect(items.some((i) => i.str.includes("Carlos Ruiz"))).toBe(true);
  });
});
