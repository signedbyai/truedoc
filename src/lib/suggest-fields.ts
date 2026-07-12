import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/anthropic";
import { extractPdfTextPositions, type PositionedTextItem } from "@/lib/pdf-text";
import { FIELD_TYPES, fieldDef, type FieldType } from "@/lib/field-types";
import { findFreePosition } from "@/lib/field-geometry";

export type FieldSuggestion = {
  page: number;
  type: FieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  role: number | null;
};

const VALID_TYPES = new Set<string>(FIELD_TYPES.map((f) => f.type));
const MAX_SUGGESTIONS = 20;

const PROMPT = (pageCount: number, itemsByPage: string) => `You are helping pre-fill an e-signature field editor \
by finding where signature/initial/date/text/checkbox fields likely belong on a document, before a human reviews \
and confirms each suggestion individually. Nothing you suggest is final.

Below is text extracted from a ${pageCount}-page PDF. Each line is given with its approximate position on the \
page as (x, y) fractions, where (0, 0) is the page's top-left corner and (1, 1) is its bottom-right corner.

${itemsByPage}

Find spots that need a signer to sign, initial, date, write something, or check a box — for example a line after \
"Signature:", an "Initials" box, a blank after "Date:", a blank for a printed name/title/company, or a checkbox \
next to an opt-in clause. For each one, respond with an object:
{"page": <1-based page number>, "x": <0-1>, "y": <0-1>, "type": "signature" | "initials" | "date" | "text" | "checkbox", "role": <integer or null>}

x and y should point at roughly where the blank or box itself is — e.g. just to the right of "Signature:", or on \
the blank line — not the label text.

"role" identifies which party a field belongs to, when the document names more than one (e.g. "Employee" vs \
"Employer", "Landlord" vs "Tenant", "Party A" vs "Party B"): use 0 for the first party's fields, 1 for the \
second party's, and so on — the same number every time that party's field appears elsewhere in the document. Use \
null if you can't confidently tell, or if the document only ever has one signer.

Only include fields the text actually indicates — don't invent ones that aren't there. Return at most ${MAX_SUGGESTIONS}. \
Return ONLY a JSON array (no markdown fences, no prose, no explanation before or after) — an empty array [] if \
you find no candidates.`;

function formatItemsByPage(items: PositionedTextItem[]): string {
  const byPage = new Map<number, PositionedTextItem[]>();
  for (const item of items) {
    const list = byPage.get(item.page);
    if (list) list.push(item);
    else byPage.set(item.page, [item]);
  }

  const lines: string[] = [];
  for (const page of Array.from(byPage.keys()).sort((a, b) => a - b)) {
    lines.push(`Page ${page}:`);
    for (const item of byPage.get(page)!) {
      lines.push(`(${item.x.toFixed(2)}, ${item.y.toFixed(2)}) "${item.str}"`);
    }
  }
  return lines.join("\n");
}

// Used whenever nothing else was suggested — either the document had no
// extractable text at all (a scanned/image PDF pdfjs can't pull anything
// from), or Claude looked at real text and still found no candidate spots.
// Rather than leave the sender staring at a completely blank editor either
// way, seed one initials field in the top-right corner: a common
// real-world convention (initial-every-page contracts put it there) and a
// reasonable generic starting point regardless of what the document is.
export function fallbackSuggestion(): FieldSuggestion {
  const def = fieldDef("initials");
  const margin = 0.04;
  return {
    page: 1,
    type: "initials",
    x: 1 - def.width - margin,
    y: margin,
    width: def.width,
    height: def.height,
    role: null,
  };
}

export type Candidate = { page: number; x: number; y: number; type: FieldType; role: number | null };

export function parseCandidates(raw: string, pageCount: number): Candidate[] {
  let jsonText = raw.trim();
  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonText = fenced[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: Candidate[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const page = Number(e.page);
    const x = Number(e.x);
    const y = Number(e.y);
    const type = typeof e.type === "string" ? e.type : "";
    const role = typeof e.role === "number" && Number.isInteger(e.role) && e.role >= 0 ? e.role : null;

    if (!Number.isFinite(page) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (!VALID_TYPES.has(type)) continue;

    out.push({
      page: Math.min(Math.max(Math.round(page), 1), Math.max(pageCount, 1)),
      x: Math.min(Math.max(x, 0), 1),
      y: Math.min(Math.max(y, 0), 1),
      type: type as FieldType,
      role,
    });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

// Converts each "click point" candidate into an actual rect the same way
// manual placement does in field-editor.tsx (centered box of the field
// type's default size), then runs them through the same overlap-avoidance
// used for manual/dragged fields (field-geometry.ts, already unit tested)
// so multiple suggestions never stack on top of each other. Pure/sync so
// it's cheaply testable without touching Anthropic or pdfjs.
export function placeCandidates(candidates: Candidate[]): FieldSuggestion[] {
  const placed: FieldSuggestion[] = [];
  for (const c of candidates) {
    const def = fieldDef(c.type);
    const rawX = Math.min(Math.max(c.x - def.width / 2, 0), 1 - def.width);
    const rawY = Math.min(Math.max(c.y - def.height / 2, 0), 1 - def.height);
    const free = findFreePosition(c.page, rawX, rawY, def.width, def.height, placed);
    placed.push({ page: c.page, type: c.type, x: free.x, y: free.y, width: def.width, height: def.height, role: c.role });
  }
  return placed;
}

// Generates field-placement suggestions for a freshly uploaded document.
// Purely a compute-and-return operation — nothing here is written to the
// database. The caller (the suggest-fields API route, and ultimately the
// field editor) treats every result as an unconfirmed suggestion until the
// sender explicitly accepts it, same as any other client-only draft state.
export async function suggestFields(bytes: Buffer, pageCount: number): Promise<FieldSuggestion[]> {
  let items: PositionedTextItem[] = [];
  try {
    items = await extractPdfTextPositions(bytes);
  } catch (err) {
    console.error("Positioned text extraction failed", err);
  }

  if (items.length === 0) return [fallbackSuggestion()];

  let raw = "";
  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: PROMPT(pageCount, formatItemsByPage(items)) }],
    });
    raw = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  } catch (err) {
    console.error("Anthropic field suggestion failed", err);
    return [fallbackSuggestion()];
  }

  const candidates = parseCandidates(raw, pageCount);
  if (candidates.length === 0) return [fallbackSuggestion()];

  return placeCandidates(candidates);
}
