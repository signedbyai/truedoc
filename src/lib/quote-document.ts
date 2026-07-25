import { generateAIText, type AIProvider } from "@/lib/ai-provider";
import { MAX_DESCRIPTION_CHARS, MAX_LINE_ITEMS, MAX_QUANTITY, MAX_UNIT_PRICE, type QuoteLineItem } from "@/lib/quote-types";
import { draftLanguageLabel, isSupportedDraftLang } from "@/lib/ai-draft-types";

export type QuoteDraftResult = { title: string; items: QuoteLineItem[] } | { error: string };

const MAX_JOB_DESCRIPTION_CHARS = 2000;
const MAX_TITLE_CHARS = 100;

// Deliberately the "fast" tier, not "quality" (the AI Drafter's tier for
// full contract text) — this call is closer to structured extraction than
// creative writing, and every number it proposes gets re-validated and
// arithmetic-checked by computeQuoteTotals() in quote-types.ts rather than
// trusted outright, so it doesn't need the strongest/priciest model.
const PROMPT = (description: string, languageLabel: string) => `You are turning a plain-language job description \
into a structured price quote for a small business or solo tradesperson to review, edit, and send to a customer \
for approval.

The user's description of the job:
"""
${description}
"""

Instructions:
- Break the job into individual line items (e.g. parts, labor, call-out fee, materials) — whatever the \
description actually implies. A simple job can be a single line item.
- For each line item, give a short plain-language description, a quantity, and a unit price.
- Write the quote's title and every line item's description in ${languageLabel}, regardless of what language the \
user's description above happens to be written in.
- Use ONLY prices, rates, and quantities the user actually stated or clearly implied (e.g. "2 hours at $70/hr" is \
quantity 2, unit price 70). If the user didn't give a price for something, set that line's unitPrice to 0 — never \
invent a plausible-sounding number. The sender will review and fill in any missing prices themselves before \
sending.
- Do not calculate or include a subtotal, tax, or total yourself — the application computes those from your line \
items, so just return the line items themselves.
- Give the quote a short, specific title (e.g. "iPhone 13 Screen Repair — Alice Chen"), using a customer's name \
only if the user's description actually named one.
- If what's described isn't really a chargeable job/service that fits a simple line-item quote (e.g. it's not a \
transaction at all, or it describes something illegal or clearly requiring a licensed professional's own pricing \
judgment you shouldn't approximate, like a structural engineering assessment), do not produce a quote — instead \
respond with exactly one line starting with the literal, untranslated text "CANNOT_QUOTE: " (so the app can \
detect it), followed by a short, plain explanation of why, written in ${languageLabel}.

Respond with ONLY a JSON object (no markdown fences, no prose, no explanation before or after):
{"title": "<short quote title>", "items": [{"description": "<line item>", "quantity": <number>, "unitPrice": <number>}]}`;

function validateDescription(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) return "Describe the job before generating a quote.";
  if (trimmed.length > MAX_JOB_DESCRIPTION_CHARS) return `Keep the description under ${MAX_JOB_DESCRIPTION_CHARS} characters.`;
  return null;
}

// Lenient by design, same precedent as suggest-fields.ts's parseCandidates:
// silently drops any entry that doesn't parse into a usable line item
// rather than failing the whole response over one bad entry, and clamps
// anything in-bounds-but-extreme rather than rejecting it outright. A
// missing/invalid title falls back to a generic one instead of erroring,
// since the sender can always retitle it in the review step.
export function parseQuoteResponse(raw: string): { title: string; items: QuoteLineItem[] } {
  let jsonText = raw.trim();
  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonText = fenced[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { title: "", items: [] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { title: "", items: [] };
  const obj = parsed as Record<string, unknown>;

  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, MAX_TITLE_CHARS) : "";

  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items: QuoteLineItem[] = [];
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const description = typeof e.description === "string" ? e.description.trim().slice(0, MAX_DESCRIPTION_CHARS) : "";
    const quantity = Number(e.quantity);
    const unitPrice = Number(e.unitPrice);
    if (!description) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    items.push({
      description,
      quantity: Math.min(quantity, MAX_QUANTITY),
      unitPrice: Math.min(unitPrice, MAX_UNIT_PRICE),
    });
    if (items.length >= MAX_LINE_ITEMS) break;
  }

  return { title, items };
}

// Generates starting line items from a plain-language job description.
// Purely a compute-and-return operation — nothing is written to the
// database here; the caller (the quote draft API route, then the review
// step's editable table, then ultimately the finalize route) treats this as
// a proposal the sender reviews/edits before anything is created, same
// pattern as draftDocument() and suggestFields().
export async function extractQuoteLineItems(
  description: string,
  provider: AIProvider = "mistral",
  // Defensive fallback to English, same precedent as draftDocument() — a
  // bad/unsupported code (stale client, direct API call) shouldn't error,
  // it should just quote in English.
  language: string = "en"
): Promise<QuoteDraftResult> {
  const descriptionError = validateDescription(description);
  if (descriptionError) return { error: descriptionError };

  const languageCode = isSupportedDraftLang(language) ? language : "en";

  let raw = "";
  try {
    raw = (
      await generateAIText({
        provider,
        tier: "fast",
        prompt: PROMPT(description.trim(), draftLanguageLabel(languageCode)),
        maxTokens: 1500,
      })
    ).trim();
  } catch (err) {
    console.error("AI quote extraction failed", err);
    return { error: "Couldn't generate a quote right now — try again in a moment." };
  }

  if (!raw) return { error: "Couldn't generate a quote — try again." };

  if (raw.startsWith("CANNOT_QUOTE:")) {
    return { error: raw.slice("CANNOT_QUOTE:".length).trim() || "This isn't something we can turn into a quote automatically." };
  }

  const { title, items } = parseQuoteResponse(raw);
  if (items.length === 0) return { error: "Couldn't find any billable items in that description — try adding more detail." };

  return { title: title || "Quote", items };
}
