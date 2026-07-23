import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { isFieldLabelLine, wrapText, type GeneratedPdf } from "@/lib/text-to-pdf";
import type { QuoteTotals } from "@/lib/quote-types";

// A genuinely tabular layout (columns + a totals block), unlike
// text-to-pdf.ts's plain wrapped-paragraph rendering — a quote needs real
// columns for description/qty/rate/amount, which paragraph text can't give
// it. Kept as its own file rather than bolted onto text-to-pdf.ts, since the
// two renderers draw fundamentally different shapes; the page-break
// bookkeeping below (page/y/ensureSpace/newPage) is deliberately duplicated
// from that file rather than shared — the two callers' needs (table rows vs.
// wrapped paragraphs) diverge enough that a shared abstraction would cost
// more than the ~15 lines it'd save. Same page size/margins/fonts as
// text-to-pdf.ts and generate-signed-pdf.ts, so a quote looks visually
// consistent with the rest of the app's generated PDFs.
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 60;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
const BOTTOM_MARGIN = 60;
const TOP_START_Y = PAGE_HEIGHT - 70;

const TITLE_SIZE = 18;
const HEADER_LABEL_SIZE = 9;
const HEADER_VALUE_SIZE = 11;
const TABLE_HEADER_SIZE = 9;
const BODY_SIZE = 10;
const TOTALS_SIZE = 11;
const TOTALS_TOTAL_SIZE = 13;

const DARK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.42, 0.46, 0.55);
const RULE = rgb(0.85, 0.87, 0.9);

// Same signature-block line height as text-to-pdf.ts's SIGNATURES block
// (kept as a separate local constant rather than importing/exporting it --
// this file already duplicates that file's page-break bookkeeping for the
// same "different enough shapes" reason, see the file doc comment above).
// Extra room below each label so a field can sit on the line without
// overlapping the next one.
const SIGNATURE_LINE_HEIGHT = 38;

// Column boundaries, built right-to-left so the three numeric columns never
// overlap: each is defined as (right edge, width), and the next column over
// is placed a fixed gap to its left. Description gets whatever room is left
// over on the page. All three numeric columns are right-aligned within
// their own box so amounts stay lined up regardless of digit count.
const COL_GAP = 12;
const COL_AMOUNT_RIGHT = RIGHT_EDGE;
const COL_AMOUNT_LEFT = COL_AMOUNT_RIGHT - 90;
const COL_PRICE_RIGHT = COL_AMOUNT_LEFT - COL_GAP;
const COL_PRICE_LEFT = COL_PRICE_RIGHT - 80;
const COL_QTY_RIGHT = COL_PRICE_LEFT - COL_GAP;
const COL_QTY_LEFT = COL_QTY_RIGHT - 40;
const COL_DESC_X = MARGIN;
const DESC_COL_WIDTH = COL_QTY_LEFT - COL_GAP - COL_DESC_X;

const ROW_LINE_HEIGHT = 14;
const ROW_GAP = 6;

export type QuoteRenderInput = {
  title: string;
  currency: string;
  fromName: string;
  // Sender-identity-picker.tsx's "Prepared by" (Team/Business orgs) — the
  // picked team member's own name, appended to the "From" line so a quote
  // shows both the org and the specific person who prepared it. Null on
  // Free/Starter orgs (the picker never renders there, nothing to append)
  // and whenever the sender leaves it unset.
  preparedByName: string | null;
  billToName: string;
  billToEmail: string | null;
  quoteDateIso: string;
  validUntilIso: string | null;
  notes: string | null;
  totals: QuoteTotals;
};

// A space before the number for multi-letter symbols ("CHF 150.00"), none
// for single-glyph ones ("$150.00") — same convention currency.ts's
// formatPrice already uses for pricing display.
function formatAmount(currency: string, amount: number): string {
  const formatted = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency.length > 1 ? `${currency} ${formatted}` : `${currency}${formatted}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function rightAlignedText(
  page: PDFPage,
  text: string,
  rightEdge: number,
  y: number,
  size: number,
  font: PDFFont,
  color = DARK
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightEdge - width, y, size, font, color });
}

// Renders a computed quote (see computeQuoteTotals in quote-types.ts — this
// function trusts `totals` completely and does no arithmetic of its own) as
// a real, multi-page PDF, so it fits the same pipeline every other document
// in this app goes through: page_count, field placement, signing.
export async function quoteToPdf(input: QuoteRenderInput): Promise<GeneratedPdf> {
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

  function drawLabelValue(x: number, label: string, value: string) {
    page.drawText(label.toUpperCase(), { x, y, size: HEADER_LABEL_SIZE, font: boldFont, color: MUTED });
    page.drawText(value, { x, y: y - 14, size: HEADER_VALUE_SIZE, font, color: DARK });
  }

  // "From" gets its own multi-line renderer instead of drawLabelValue's
  // single line -- concatenating "Workspace — Name" onto one line
  // overflowed past the column into the Bill To text next to it for
  // anything longer than a short workspace name (2026-07-23, caught in
  // testing on a real quote). Person's name first, workspace name on its
  // own line below -- reads like a signature line ("Michael Eagles,
  // Amara Okafor's workspace") and the wrap is a hard line break, not
  // word-wrap, so it can never overflow into the next column regardless
  // of length.
  function drawFromBlock(x: number, lines: string[]) {
    page.drawText("FROM", { x, y, size: HEADER_LABEL_SIZE, font: boldFont, color: MUTED });
    lines.forEach((line, i) => {
      page.drawText(line, { x, y: y - 14 - i * 13, size: HEADER_VALUE_SIZE, font, color: DARK });
    });
  }

  // Title
  page.drawText(input.title, { x: MARGIN, y, size: TITLE_SIZE, font: boldFont, color: DARK });
  y -= TITLE_SIZE + 22;

  // From / Bill To / Date / Valid-until — a 2x2 header grid. "Prepared by"
  // (now always the signed-in user's own name, silently — see
  // frequent-signers.ts's selfDisplayName) is the person's name; fromName is
  // the org/workspace name — shown as two stacked lines under FROM rather
  // than one concatenated line, see drawFromBlock above.
  const rightColX = MARGIN + DESC_COL_WIDTH / 2 + 40;
  const fromLines = input.preparedByName ? [input.preparedByName, input.fromName || "—"] : [input.fromName || "—"];
  drawFromBlock(MARGIN, fromLines);
  drawLabelValue(
    rightColX,
    "Bill to",
    input.billToEmail ? `${input.billToName || "—"} (${input.billToEmail})` : input.billToName || "—"
  );
  // Same 26px gap below the value block as every other header row -- just
  // measured from wherever FROM's last line landed, which varies with
  // fromLines.length.
  y -= 40 + (fromLines.length - 1) * 13;
  drawLabelValue(MARGIN, "Quote date", formatDate(input.quoteDateIso));
  if (input.validUntilIso) drawLabelValue(rightColX, "Valid until", formatDate(input.validUntilIso));
  y -= 40;

  // Table header row
  page.drawText("DESCRIPTION", { x: COL_DESC_X, y, size: TABLE_HEADER_SIZE, font: boldFont, color: MUTED });
  rightAlignedText(page, "QTY", COL_QTY_RIGHT, y, TABLE_HEADER_SIZE, boldFont, MUTED);
  rightAlignedText(page, "UNIT PRICE", COL_PRICE_RIGHT, y, TABLE_HEADER_SIZE, boldFont, MUTED);
  rightAlignedText(page, "AMOUNT", COL_AMOUNT_RIGHT, y, TABLE_HEADER_SIZE, boldFont, MUTED);
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT_EDGE, y }, thickness: 1, color: RULE });
  y -= 16;

  for (const line of input.totals.lines) {
    const wrapped = wrapText(line.description, font, BODY_SIZE, DESC_COL_WIDTH);
    const rowHeight = Math.max(wrapped.length, 1) * ROW_LINE_HEIGHT;
    ensureSpace(rowHeight + ROW_GAP);

    const rowTopY = y;
    for (let i = 0; i < wrapped.length; i++) {
      page.drawText(wrapped[i], { x: COL_DESC_X, y: y - i * ROW_LINE_HEIGHT, size: BODY_SIZE, font, color: DARK });
    }
    const qtyDisplay = Number.isInteger(line.quantity) ? String(line.quantity) : line.quantity.toFixed(2);
    rightAlignedText(page, qtyDisplay, COL_QTY_RIGHT, rowTopY, BODY_SIZE, font);
    rightAlignedText(page, formatAmount(input.currency, line.unitPrice), COL_PRICE_RIGHT, rowTopY, BODY_SIZE, font);
    rightAlignedText(page, formatAmount(input.currency, line.lineTotal), COL_AMOUNT_RIGHT, rowTopY, BODY_SIZE, font);

    y -= rowHeight + ROW_GAP;
  }

  y -= 6;
  ensureSpace(70);
  page.drawLine({ start: { x: COL_PRICE_LEFT, y }, end: { x: RIGHT_EDGE, y }, thickness: 1, color: RULE });
  y -= 20;

  page.drawText("Subtotal", { x: COL_PRICE_LEFT, y, size: TOTALS_SIZE, font, color: MUTED });
  rightAlignedText(page, formatAmount(input.currency, input.totals.subtotal), COL_AMOUNT_RIGHT, y, TOTALS_SIZE, font);
  y -= 20;

  if (input.totals.taxRatePercent > 0) {
    page.drawText(`Tax (${input.totals.taxRatePercent}%)`, { x: COL_PRICE_LEFT, y, size: TOTALS_SIZE, font, color: MUTED });
    rightAlignedText(page, formatAmount(input.currency, input.totals.taxAmount), COL_AMOUNT_RIGHT, y, TOTALS_SIZE, font);
    y -= 20;
  }

  page.drawText("Total", { x: COL_PRICE_LEFT, y, size: TOTALS_TOTAL_SIZE, font: boldFont, color: DARK });
  rightAlignedText(page, formatAmount(input.currency, input.totals.total), COL_AMOUNT_RIGHT, y, TOTALS_TOTAL_SIZE, boldFont);
  y -= 32;

  if (input.notes && input.notes.trim()) {
    ensureSpace(40);
    page.drawText("NOTES", { x: MARGIN, y, size: HEADER_LABEL_SIZE, font: boldFont, color: MUTED });
    y -= 14;
    for (const wrapped of wrapText(input.notes.trim(), font, BODY_SIZE, RIGHT_EDGE - MARGIN)) {
      ensureSpace(ROW_LINE_HEIGHT);
      page.drawText(wrapped, { x: MARGIN, y, size: BODY_SIZE, font, color: DARK });
      y -= ROW_LINE_HEIGHT;
    }
  }

  // Client acceptance signature block (2026-07-23) — until now a quote had
  // nothing to actually sign on the PDF itself, so "Suggested fields" found
  // no signature line to detect and a sender had to place one manually
  // every time. Same "Signature:"/"Print Name:"/"Date:" label convention
  // and extra per-line height as text-to-pdf.ts's AI-drafted-document
  // SIGNATURES block, so suggest-fields.ts's detection recognizes this the
  // same way. Client-only (not a mutual two-party block) — a quote is the
  // sender's own offer; only the recipient needs to accept it.
  y -= 20;
  ensureSpace(18 + SIGNATURE_LINE_HEIGHT * 3);
  page.drawText("CLIENT ACCEPTANCE", { x: MARGIN, y, size: HEADER_LABEL_SIZE, font: boldFont, color: MUTED });
  y -= 22;
  // Bill-to name (2026-07-23) is baked directly onto the Print Name line,
  // not just kept in the Bill To header above -- suggest-fields.ts's prompt
  // reads a signature block's "Name:"/"Print Name:" line as that party's real
  // name (see its "do not leave name null just because the signature line
  // itself is blank" instruction), which previously had nothing to read here.
  // With a real name printed, the field editor's detected-parties panel
  // shows it pre-filled, and phase 2's name-match against frequent signers
  // (frequent-signer-match.ts) can find and auto-fill the matching email --
  // the same loop AI-drafted documents already close via their own
  // placeholder-vs-real-name signature blocks. Falls back to a blank label
  // (unchanged prior behavior) when no Bill To name was entered.
  const printNameLine = input.billToName.trim() ? `Print Name: ${input.billToName.trim()}` : "Print Name:";
  for (const rawLine of ["Signature:", printNameLine, "Date:"]) {
    const wrapped = wrapText(rawLine, font, BODY_SIZE, RIGHT_EDGE - MARGIN);
    for (let i = 0; i < wrapped.length; i++) {
      // Only the label's own (last) wrapped line gets the bigger
      // field-placement gap -- same rule text-to-pdf.ts uses, so an
      // unusually long business name that fails isFieldLabelLine's length
      // guard just wraps like normal paragraph text instead of mis-reserving
      // room for a field on every wrapped segment.
      const advance = isFieldLabelLine(rawLine) && i === wrapped.length - 1 ? SIGNATURE_LINE_HEIGHT : ROW_LINE_HEIGHT;
      ensureSpace(advance);
      page.drawText(wrapped[i], { x: MARGIN, y, size: BODY_SIZE, font, color: DARK });
      y -= advance;
    }
  }

  const bytes = Buffer.from(await pdfDoc.save());
  return { bytes, pageCount: pdfDoc.getPageCount() };
}
