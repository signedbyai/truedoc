import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderExampleTemplatePdf } from "./example-template";

describe("renderExampleTemplatePdf", () => {
  it("produces a well-formed, single US-Letter page PDF", async () => {
    const bytes = await renderExampleTemplatePdf();
    const reloaded = await PDFDocument.load(bytes);
    const pages = reloaded.getPages();
    expect(pages).toHaveLength(1);
    const { width, height } = pages[0].getSize();
    expect(width).toBe(612);
    expect(height).toBe(792);
  });
});
