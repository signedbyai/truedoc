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
// Signature-block label lines ("Signature:", "Print Name:", "Date:", or their
// translations) advance by this instead of BODY_LINE_HEIGHT, leaving vertical
// room to drop a signature/date field on the line without it overlapping the
// next one. The block used to render at the normal 15px line height, packing
// the lines too tight to place fields between them.
const SIGNATURE_LINE_HEIGHT = 38;

const DARK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.42, 0.46, 0.55);
const PREPARED_BY_SIZE = 10;

// A short "label:" line whose value is empty or a bracket placeholder — i.e. a
// signature-block field line ("Signature:", "Print Name: [Client Name]",
// "Date:", or a translated equivalent). Deliberately conservative so body
// sentences and long headings that merely contain a colon don't get the extra
// spacing: the label must be short and nothing sentence-like may follow the
// colon.
//
// Label-side thresholds loosened 2026-07-25 (24 chars/3 words -> 40/6): a
// translated "Print Name:" can run considerably longer than the English
// original — Spanish's "Nombre en letra de imprenta:" is 27 chars/5 words,
// past the original limit, so a blank (no-name-yet) line in that language
// was wrongly denied the extra field-placement spacing below. The `after`
// check (still 24 chars, still no sentence punctuation) is what actually
// carries the weight of rejecting real prose — see the "does not match body
// sentences" test below, where every false-positive case fails on `after`
// containing a full sentence, not on the label-length guard alone.
export function isFieldLabelLine(line: string): boolean {
  const t = line.trim();
  const idx = t.indexOf(":");
  if (idx < 1) return false;
  const label = t.slice(0, idx).trim();
  const after = t.slice(idx + 1).trim();
  if (label.length > 40 || label.split(/\s+/).length > 6) return false;
  if (after.length > 24 || /[.!?]/.test(after)) return false;
  return true;
}

// Greedy word-wrap using the font's actual measured width — generic
// enough to reuse for both the title and body at whatever size is passed.
// Exported so quote-to-pdf.ts's line-item table can wrap a long description
// inside its column without duplicating this logic.
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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
// `preparedByName` (added 2026-07-23, sender-identity-picker.tsx's "Prepared
// by" -- Team/Business orgs only) is optional so the two existing call sites
// (draft/finalize/route.ts and this file's own tests) don't need updating
// just to keep compiling; omitting it (or passing null) renders the same
// title+body-only PDF as before this existed.
export async function textToPdf(title: string, body: string, preparedByName?: string | null): Promise<GeneratedPdf> {
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

  if (preparedByName && preparedByName.trim()) {
    ensureSpace(PREPARED_BY_SIZE + 4);
    const line = `Prepared by ${preparedByName.trim()}`;
    const width = font.widthOfTextAtSize(line, PREPARED_BY_SIZE);
    page.drawText(line, { x: (PAGE_WIDTH - width) / 2, y, size: PREPARED_BY_SIZE, font, color: MUTED });
    y -= PREPARED_BY_SIZE + 12;
  }

  const paragraphs = body.split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // Preserve intentional single line breaks within a paragraph (e.g. a
    // "Signature:" / "Print Name:" / "Date:" block) as their own wrapped
    // groups, rather than merging them into one flowing paragraph.
    for (const rawLine of trimmedParagraph.split("\n")) {
      // Signature-block label lines get extra room below so fields can be
      // placed on them; only the label's own (last) line takes the bigger
      // advance in the rare case it wraps.
      const labelLine = isFieldLabelLine(rawLine);
      const wrapped = wrapText(rawLine.trim(), font, BODY_SIZE, MAX_TEXT_WIDTH);
      for (let i = 0; i < wrapped.length; i++) {
        const advance = labelLine && i === wrapped.length - 1 ? SIGNATURE_LINE_HEIGHT : BODY_LINE_HEIGHT;
        ensureSpace(advance);
        page.drawText(wrapped[i], { x: MARGIN, y, size: BODY_SIZE, font, color: DARK });
        y -= advance;
      }
    }
    y -= PARAGRAPH_GAP;
  }

  const bytes = Buffer.from(await pdfDoc.save());
  return { bytes, pageCount: pdfDoc.getPageCount() };
}
