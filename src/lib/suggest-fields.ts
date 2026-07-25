import { generateAIText, type AIProvider } from "@/lib/ai-provider";
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
  // What a text field is for, when the AI can tell ("name"/"title"/"company").
  // Only "name" is used today (sign-time pre-fill of the signer's name); the
  // others are stored for future use. Null for non-text fields and plain text.
  purpose: string | null;
};

const VALID_TYPES = new Set<string>(FIELD_TYPES.map((f) => f.type));
const VALID_PURPOSES = new Set(["name", "title", "company"]);
const MAX_SUGGESTIONS = 20;

const PROMPT = (pageCount: number, itemsByPage: string) => `You are helping pre-fill an e-signature field editor \
by (a) identifying the distinct signing parties a document expects and (b) finding where \
signature/initial/date/text/checkbox fields likely belong, before a human reviews and confirms each suggestion \
individually. Nothing you suggest is final.

Below is text extracted from a ${pageCount}-page PDF. Each line is given with its approximate position on the \
page as (x, y, w) fractions, where (0, 0) is the page's top-left corner, (1, 1) is its bottom-right corner, and \
w is that text run's own width — so it spans from x to roughly x + w.

${itemsByPage}

First, identify the distinct signing PARTIES the document expects — the people or entities who each need to sign \
(e.g. "Employer" and "Employee", "Landlord" and "Tenant", "Company" and "Signatory", "Party A" and "Party B"). \
Number them from 0 in the order they first appear and give each a short human label. If the document only ever \
has one signer, return a single party or an empty list.

For each party, also return "name", "title" and "company".

The SIGNATURE BLOCKS near the end are the main source for "name" and "title", and you must read them. A block \
typically looks like:

    For the <party label>:
    ______________________
    Signature
    Name: <the person's printed name>
    Title: <their job title>

The heading above the block ("For the Client:", "Signed by the Tenant:", or similar) tells you WHICH party the \
block belongs to — match it to that party's label. The text after "Name:" is that party's "name" and the text \
after "Title:" is their "title". A name printed there is a real, stated name: use it. Do not leave "name" null \
just because the signature line itself is blank — the printed name underneath is what you want.

"company" is the organization the party signs for, usually the entity named in the opening paragraph — in a \
sentence of the form 'made between <entity A> ("the <label A>") and <entity B> ("the <label B>")', entity A is \
the company for the party labelled A.

Use null only when the document genuinely does not state something. Do not invent or infer: a document that \
only ever says "the Purchaser" has no name for that party, and a wrong name is worse than no name. Returning a \
company with a null name is normal and fine.

Then find the field spots that need a signer to sign, initial, date, write something, or check a box — for \
example a line after "Signature:", an "Initials" box, a blank after "Date:", a blank for a printed \
name/title/company, or a checkbox next to an opt-in clause. These labels may appear translated into the \
document's own language instead of English (e.g. "Firma:", "Signature :", "Unterschrift:") — treat the \
translated form the same way you would the English one; don't require an exact English match. Point x and y at \
roughly where the blank or box \
itself is, using each line's w to find it: for a colon-terminated label like "Signature:" or "Date:" at (x, y, w), \
the blank comes right AFTER the label, so place the field's x at that label's own x + w (plus a small gap of \
about 0.01-0.02), never inside its x-to-x+w span and never before it — a field placed at or before the label's \
own x lands on top of the label text itself, which is wrong. For each field's "role", use the party number it \
belongs to (0, 1, …), or null if you can't confidently tell or there's only one signer.

Skip any name/title/company blank that's already filled in — if a real value already appears right after \
"Name:", "Print Name:", "Title:", or "Company:" on the page (not just the bare label with nothing after it, and \
not a placeholder like "___" or "[name]"), that spot is already done and does NOT need a field. Only genuinely \
still-blank spots need one. A signature line and a date blank almost always still need fields even when a name \
is already printed nearby on the same block — don't skip those just because a neighboring name is filled.

For a "text" field, also set "purpose" to "name" when the blank is clearly for a person's printed or full name \
(e.g. after "Print Name:", "Name:"), "title" for a job title (after "Title:"), or "company" for a company or \
organization name. Omit "purpose" (or use null) for any other text field and for all non-text fields — telling \
these apart matters, so don't guess "name" for a title or a generic blank.

Only include fields the text actually indicates — don't invent ones that aren't there. Return at most \
${MAX_SUGGESTIONS} fields.

Respond with ONLY a JSON object (no markdown fences, no prose, no explanation before or after):
{"parties": [{"role": <integer from 0>, "label": "<short party label>", "name": "<person's name or null>", "title": "<job title or null>", "company": "<organization or null>"}], "fields": [{"page": <1-based page number>, "x": <0-1>, "y": <0-1>, "type": "signature" | "initials" | "date" | "text" | "checkbox", "role": <integer or null>, "purpose": "name" | "title" | "company" | null}]}

Use an empty "fields" array if you find no field spots.`;

// Exported for testing the width-formatting behavior directly, without
// going through the full prompt string.
export function formatItemsByPage(items: PositionedTextItem[]): string {
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
      // width is optional on PositionedTextItem (older callers/test mocks
      // may omit it) — fall back to 0 rather than emitting "undefined" into
      // the prompt text, which would read as a literal token to the model.
      const w = typeof item.width === "number" ? item.width : 0;
      lines.push(`(${item.x.toFixed(2)}, ${item.y.toFixed(2)}, ${w.toFixed(2)}) "${item.str}"`);
    }
  }
  return lines.join("\n");
}

// Used whenever nothing else was suggested. Rather than leave the sender
// staring at a completely blank editor, seed one initials field in the
// top-right corner: a common real-world convention (initial-every-page
// contracts put it there) and a reasonable generic starting point
// regardless of what the document is. See SuggestFieldsResult.unreadable
// for why this same field is presented differently depending on *why*
// nothing else was suggested.
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
    purpose: null,
  };
}

// A distinct signing party the document expects, with the human label the
// model gave it ("Employer", "Tenant", …). `role` is the same integer the
// field candidates reference, so a party maps to the recipient slot the field
// editor binds role-tagged suggestions to (order_index === role).
// `label` is the ROLE ("Consultant", "Tenant"). name/title/company are the
// actual details when the document states them, and are null far more often
// than not — a contract that only ever says "the Purchaser" yields a label and
// nothing else. Nullable rather than optional so the absence is explicit at
// every call site.
export type Party = {
  role: number;
  label: string;
  name: string | null;
  title: string | null;
  company: string | null;
};
const MAX_PARTIES = 10;

// Pulls the "parties" list out of the model's JSON object. Bare-array
// responses (no parties key) yield []. Deduped by role and sorted, so the
// editor can render one email input per party in a stable order.
// Details are advisory and user-visible before anything is sent, so anything
// that isn't a usable string becomes null rather than throwing.
function optionalDetail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
}

export function parseParties(raw: string): Party[] {
  let jsonText = raw.trim();
  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonText = fenced[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const list = (parsed as Record<string, unknown>).parties;
  if (!Array.isArray(list)) return [];

  const out: Party[] = [];
  const seen = new Set<number>();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const role = Number(e.role);
    const label = typeof e.label === "string" ? e.label.trim() : "";
    if (!Number.isInteger(role) || role < 0 || !label) continue;
    if (seen.has(role)) continue;
    seen.add(role);
    out.push({
      role,
      label: label.slice(0, 40),
      // Same treatment as label: string-or-nothing, trimmed, length-capped.
      // A missing key, an explicit null, a number, or an empty string after
      // trimming all collapse to null — the model omits these often, and older
      // responses predate the fields entirely, so absence must be ordinary
      // rather than exceptional.
      name: optionalDetail(e.name),
      title: optionalDetail(e.title),
      company: optionalDetail(e.company),
    });
    if (out.length >= MAX_PARTIES) break;
  }
  out.sort((a, b) => a.role - b.role);
  return out;
}

export type Candidate = { page: number; x: number; y: number; type: FieldType; role: number | null; purpose: string | null };

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
  // Accepts either the current object shape {parties, fields} or a bare array
  // of field candidates (older prompt / defensive backward-compatibility).
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).fields)
      ? ((parsed as Record<string, unknown>).fields as unknown[])
      : null;
  if (!arr) return [];

  const out: Candidate[] = [];
  for (const entry of arr) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const page = Number(e.page);
    const x = Number(e.x);
    const y = Number(e.y);
    const type = typeof e.type === "string" ? e.type : "";
    const role = typeof e.role === "number" && Number.isInteger(e.role) && e.role >= 0 ? e.role : null;
    // Purpose only means anything on a text field; ignore it on other types.
    const purposeRaw = typeof e.purpose === "string" ? e.purpose.toLowerCase().trim() : "";
    const purpose = type === "text" && VALID_PURPOSES.has(purposeRaw) ? purposeRaw : null;

    if (!Number.isFinite(page) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (!VALID_TYPES.has(type)) continue;

    out.push({
      page: Math.min(Math.max(Math.round(page), 1), Math.max(pageCount, 1)),
      x: Math.min(Math.max(x, 0), 1),
      y: Math.min(Math.max(y, 0), 1),
      type: type as FieldType,
      role,
      purpose,
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
    placed.push({ page: c.page, type: c.type, x: free.x, y: free.y, width: def.width, height: def.height, role: c.role, purpose: c.purpose });
  }
  return placed;
}

export type SuggestFieldsResult = {
  suggestions: FieldSuggestion[];
  // Distinct signing parties the model identified (with human labels). Drives
  // the field editor's "we detected N signers" guided setup. Empty when the
  // document couldn't be analyzed, when no candidates were found, or when the
  // model named no parties (single-signer documents).
  parties: Party[];
  // True only when we genuinely have no idea what's in this document —
  // either it has no extractable text at all (a scanned/image PDF pdfjs
  // can't pull anything from) or the Claude call itself failed (a network/
  // API error, not a real analysis result). In both cases the single
  // fallback field is a pure guess with zero relationship to the
  // document's actual content.
  //
  // False when Claude genuinely read the document's real text and
  // concluded there were no candidate spots — a real (if inconclusive)
  // look at the content, not a guess.
  //
  // The API route and field editor use this to be honest with the sender
  // about which kind of "nothing to suggest" happened, rather than
  // presenting a guess and a real-but-empty analysis identically.
  unreadable: boolean;
};

// Generates field-placement suggestions for a freshly uploaded document.
// Purely a compute-and-return operation — nothing here is written to the
// database. The caller (the suggest-fields API route, and ultimately the
// field editor) treats every result as an unconfirmed suggestion until the
// sender explicitly accepts it, same as any other client-only draft state.
export async function suggestFields(
  bytes: Buffer,
  pageCount: number,
  provider: AIProvider = "mistral"
): Promise<SuggestFieldsResult> {
  let items: PositionedTextItem[] = [];
  try {
    items = await extractPdfTextPositions(bytes);
  } catch (err) {
    console.error("Positioned text extraction failed", err);
  }

  if (items.length === 0) return { suggestions: [fallbackSuggestion()], unreadable: true, parties: [] };

  let raw = "";
  try {
    raw = await generateAIText({
      provider,
      tier: "fast",
      prompt: PROMPT(pageCount, formatItemsByPage(items)),
      maxTokens: 1500,
    });
  } catch (err) {
    console.error("AI field suggestion failed", err);
    return { suggestions: [fallbackSuggestion()], unreadable: true, parties: [] };
  }

  const candidates = parseCandidates(raw, pageCount);
  if (candidates.length === 0) return { suggestions: [fallbackSuggestion()], unreadable: false, parties: [] };

  return { suggestions: placeCandidates(candidates), unreadable: false, parties: parseParties(raw) };
}
