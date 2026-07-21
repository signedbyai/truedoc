import { generateAIText, type AIProvider } from "@/lib/ai-provider";
import {
  DOCUMENT_TYPES,
  documentTypeLabel,
  draftLanguageLabel,
  isSupportedDraftLang,
  type DraftDocumentType,
} from "@/lib/ai-draft-types";

export type DraftResult = { title: string; body: string } | { error: string };

const MAX_DESCRIPTION_CHARS = 2000;

// Per-type structural guidance — keeps each draft in the shape a reviewer
// would actually expect for that kind of document, without steering
// content (that's the user's description's job). Kept deliberately generic/
// standard-form rather than aggressive or one-sided, and every type ends
// with the same instruction to close with a labeled signature block — see
// the shared closing instruction below for why.
const TYPE_GUIDANCE: Record<DraftDocumentType, string> = {
  freelance:
    "A freelance/services agreement typically covers: the parties, a description of the work/deliverables, " +
    "payment amount and schedule, timeline, who owns the finished work (intellectual property), confidentiality " +
    "(if relevant), termination terms, and independent-contractor status (not an employee).",
  nda: "A non-disclosure agreement typically covers: the parties (and whether it's mutual or one-way), a " +
    "definition of what counts as confidential information, permitted uses and exclusions (e.g. information " +
    "already public), the duration of the confidentiality obligation, and remedies for a breach.",
  waiver:
    "A waiver/release of liability typically covers: a description of the activity, an acknowledgment of the " +
    "risks involved, an assumption of risk by the participant, a release of the organizer from liability for " +
    "ordinary negligence, and an emergency-contact or medical-information line if relevant.",
  general:
    "A general agreement typically covers: the parties, a plain description of what each party is agreeing to do, " +
    "any payment or exchange involved, the timeline or duration, and how either party can end the agreement.",
  boiler_maintenance:
    "A boiler/heating maintenance agreement typically covers: the property and equipment covered, the service " +
    "schedule (e.g. one annual inspection), what's included versus billed separately (parts, emergency " +
    "call-outs), expected response time for breakdowns, payment terms (one-off or recurring), and liability or " +
    "insurance requirements for gas/heating-system work.",
  bike_rental:
    "A bicycle rental agreement typically covers: the bicycle(s) being rented and their condition at handover, " +
    "the rental period and rate, a security deposit and what it can be used against, the renter's responsibility " +
    "for damage, loss, or theft during the rental period, and the condition the bicycle must be returned in.",
};

const PROMPT = (documentType: DraftDocumentType, description: string, languageLabel: string) => `You are drafting \
a standard-form ${documentTypeLabel(documentType)}, written in plain ${languageLabel}, for a small business or \
solo professional to review, edit, and send for e-signature. This is a starting draft the user will review and \
adjust themselves — not final legal advice, and not tailored to any specific jurisdiction's requirements.

${TYPE_GUIDANCE[documentType]}

The user's description of their situation:
"""
${description}
"""

Instructions:
- Use what the user described to fill in specifics (names, amounts, dates, scope). For anything they didn't \
specify, insert a clearly marked blank in square brackets, e.g. [Client Name], [Amount], [Start Date] — never \
invent a specific fact they didn't give you. Keep bracketed placeholders themselves in ${languageLabel} too \
(e.g. the equivalent of "[Client Name]" in ${languageLabel}, not the English word-for-word).
- Write the entire document — title, section headings, body text, and the closing signature block — in \
${languageLabel}, regardless of what language the user's description above happens to be written in.
- Keep the language plain, neutral, and balanced between the parties — not aggressive or one-sided toward either \
side.
- Structure it with a title, numbered sections with short headings, and plain paragraphs — no markdown formatting \
(no #, *, or _ characters), since this becomes a printed document.
- End with a signature block (the ${languageLabel} equivalent of a "SIGNATURES" heading) listing each party by \
name/role, each with its own "Signature:" / "Print Name:" / "Date:" line (translated into ${languageLabel}) on \
separate lines, ready for physical signature placement.
- If what's being asked for falls outside a standard ${documentTypeLabel(documentType)} (e.g. it actually needs a \
different, more specialized kind of document, or involves something that sounds illegal or clearly requires a \
licensed professional to prepare, like a real estate deed, a will, or a securities offering), do not draft it — \
instead respond with exactly one line starting with the literal, untranslated text "CANNOT_DRAFT: " (so the app \
can detect it), followed by a short, plain explanation of why, written in ${languageLabel}.

Respond with the title on the first line, then a blank line, then the full document body. Nothing else — no \
preamble, no notes about what you changed, no markdown fences.`;

function validateDescription(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) return "Describe what you need before generating a draft.";
  if (trimmed.length > MAX_DESCRIPTION_CHARS) return `Keep the description under ${MAX_DESCRIPTION_CHARS} characters.`;
  return null;
}

// Generates a starting draft from a plain-language description. Purely a
// compute-and-return operation — nothing is written to the database here;
// the caller (the draft API route, then ultimately the finalize route)
// treats this as a proposal the sender reviews/edits before anything is
// created, same as AI field-placement suggestions elsewhere in this app.
export async function draftDocument(
  documentType: string,
  description: string,
  provider: AIProvider = "mistral",
  language: string = "en"
): Promise<DraftResult> {
  if (!DOCUMENT_TYPES.some((t) => t.id === documentType)) {
    return { error: "Choose a document type." };
  }
  const descriptionError = validateDescription(description);
  if (descriptionError) return { error: descriptionError };

  // Defensive fallback to English, same precedent as normalizeAIProvider —
  // a bad/unsupported code (stale client, direct API call) shouldn't error,
  // it should just draft in English. See ai-draft-types.ts for why this is
  // a narrower set than the "what am I signing?" summary's language list.
  const languageCode = isSupportedDraftLang(language) ? language : "en";

  let raw = "";
  try {
    raw = (
      await generateAIText({
        provider,
        tier: "quality",
        prompt: PROMPT(documentType as DraftDocumentType, description.trim(), draftLanguageLabel(languageCode)),
        maxTokens: 4000,
      })
    ).trim();
  } catch (err) {
    console.error("AI document drafting failed", err);
    return { error: "Couldn't generate a draft right now — try again in a moment." };
  }

  if (!raw) return { error: "Couldn't generate a draft — try again." };

  if (raw.startsWith("CANNOT_DRAFT:")) {
    return { error: raw.slice("CANNOT_DRAFT:".length).trim() || "This isn't something we can draft automatically." };
  }

  const [firstLine, ...rest] = raw.split("\n");
  const title = firstLine.trim().replace(/^#+\s*/, "") || documentTypeLabel(documentType);
  const body = rest.join("\n").replace(/^\s*\n/, "").trim();

  if (!body) return { error: "Couldn't generate a draft — try again." };

  return { title, body };
}
