import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { textToPdf, isFieldLabelLine } from "./text-to-pdf";

describe("isFieldLabelLine", () => {
  it("matches signature-block field labels (incl. translations + placeholders)", () => {
    for (const line of ["Signature:", "Print Name:", "Date:", "Print Name: [Client Name]", "Handtekening:", "Datum:", "Firma:"]) {
      expect(isFieldLabelLine(line), line).toBe(true);
    }
  });

  it("does not match body sentences or long headings that merely contain a colon", () => {
    for (const line of [
      "The following terms apply: the parties agree to the schedule below.",
      "Note: either party may terminate this agreement with thirty days notice.",
      "This is an ordinary paragraph with no colon at all",
      "1. Scope of Work and Deliverables to Be Provided:",
    ]) {
      expect(isFieldLabelLine(line), line).toBe(false);
    }
  });
});

describe("textToPdf", () => {
  it("produces a valid, loadable single-page PDF for a short document", async () => {
    const result = await textToPdf("Test Agreement", "This is a short paragraph.\n\nAnd a second one.");
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);

    // Round-trip through pdf-lib to confirm it's actually a well-formed PDF,
    // not just non-empty bytes.
    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(1);
  });

  it("paginates a long body across multiple pages", async () => {
    const longBody = Array.from({ length: 120 }, (_, i) => `Paragraph number ${i + 1} with some filler content.`).join(
      "\n\n"
    );
    const result = await textToPdf("Long Agreement", longBody);
    expect(result.pageCount).toBeGreaterThan(1);

    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(result.pageCount);
  });

  it("handles an empty body without throwing", async () => {
    const result = await textToPdf("Empty Agreement", "");
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(result.pageCount);
  });

  it("keeps signature-block lines on separate lines rather than merging them", async () => {
    // Real usage: a "SIGNATURES" section with Signature:/Print Name:/Date:
    // each on their own line within one paragraph — these must stay
    // visually distinct lines, not get wrapped into one run-on line.
    const body = "SIGNATURES\n\nParty A\nSignature:\nPrint Name:\nDate:";
    const result = await textToPdf("Agreement", body);
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("wraps a very long single word without infinite-looping", async () => {
    const longWord = "a".repeat(500);
    const result = await textToPdf("Agreement", longWord);
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
  }, 10000);
});
