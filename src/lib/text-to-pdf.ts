import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// US Letter + Helvetica — matches the existing convention in
// generate-signed-pdf.ts (the only other place this app draws text onto a
// PDF), so an AI-drafted document looks visually consistent with the
// certificate-of-completion page appended to every signed document.
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 60;
const MAX_TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_MARGIN = 60;
const TOP_START_Y = PAGE_HEIGHT - 70;

const TITLE_SIZE = 18;
const TITLE_LINE_HEIGHT = 24;
const BODY_SIZE = 11;
const BODY_LINE_HEIGHT = 15;
const PARAGRAPH_GAP = 8;

const DARK = rgb(0.06, 0.09, 0.16);

// Greedy word-wrap using the font's actual measured width — generic
// enough to reuse for both the title and body at whatever size is passed.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export type GeneratedPdf = { bytes: Buffer; pageCount: number };

// Renders plain text (a title plus a body with blank-line-separated
// paragraphs) into a real, multi-page PDF — used to turn an AI-drafted
// document into something that fits the rest of this app's pipeline
// (page_count, field placement, signing), which otherwise only ever
// receives PDFs a sender already had. No rich formatting: this is meant to
// look like a plain, readable contract draft, not a styled document —
// consistent with the AI-draft feature's framing as a starting point, not
// a polished final product.
export async function textToPdf(title: string, body: string): Promise<GeneratedPdf> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = TOP_START_Y;

  function newPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = TOP_START_Y;
  }

  function ensureSpace(neededHeight: number) {
    if (y - neededHeight < BOTTOM_MARGIN) newPage();
  }

  for (const line of wrapText(title.trim(), boldFont, TITLE_SIZE, MAX_TEXT_WIDTH)) {
    ensureSpace(TITLE_LINE_HEIGHT);
    const width = boldFont.widthOfTextAtSize(line, TITLE_SIZE);
    page.drawText(line, { x: (PAGE_WIDTH - width) / 2, y, size: TITLE_SIZE, font: boldFont, color: DARK });
    y -= TITLE_LINE_HEIGHT;
  }
  y -= 10;

  const paragraphs = body.split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // Preserve intentional single line breaks within a paragraph (e.g. a
    // "Signature:" / "Print Name:" / "Date:" block) as their own wrapped
    // groups, rather than merging them into one flowing paragraph.
    for (const rawLine of trimmedParagraph.split("\n")) {
      const wrapped = wrapText(rawLine.trim(), font, BODY_SIZE, MAX_TEXT_WIDTH);
      for (const line of wrapped) {
        ensureSpace(BODY_LINE_HEIGHT);
        page.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font, color: DARK });
        y -= BODY_LINE_HEIGHT;
      }
    }
    y -= PARAGRAPH_GAP;
  }

  const bytes = Buffer.from(await pdfDoc.save());
  return { bytes, pageCount: pdfDoc.getPageCount() };
}
