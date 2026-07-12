import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/anthropic";
import { DOCUMENT_TYPES, documentTypeLabel, type DraftDocumentType } from "@/lib/ai-draft-types";

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
};

const PROMPT = (documentType: DraftDocumentType, description: string) => `You are drafting a standard-form, \
plain-English ${documentTypeLabel(documentType)} for a small business or solo professional to review, edit, and \
send for e-signature. This is a starting draft the user will review and adjust themselves — not final legal \
advice, and not tailored to any specific jurisdiction's requirements.

${TYPE_GUIDANCE[documentType]}

The user's description of their situation:
"""
${description}
"""

Instructions:
- Use what the user described to fill in specifics (names, amounts, dates, scope). For anything they didn't \
specify, insert a clearly marked blank in square brackets, e.g. [Client Name], [Amount], [Start Date] — never \
invent a specific fact they didn't give you.
- Keep the language plain, neutral, and balanced between the parties — not aggressive or one-sided toward either \
side.
- Structure it with a title, numbered sections with short headings, and plain paragraphs — no markdown formatting \
(no #, *, or _ characters), since this becomes a printed document.
- End with a section titled "SIGNATURES" listing each party by name/role, each with its own "Signature:", "Print \
Name:", and "Date:" line on separate lines, ready for physical signature placement.
- If what's being asked for falls outside a standard ${documentTypeLabel(documentType)} (e.g. it actually needs a \
different, more specialized kind of document, or involves something that sounds illegal or clearly requires a \
licensed professional to prepare, like a real estate deed, a will, or a securities offering), do not draft it — \
instead respond with exactly one line: "CANNOT_DRAFT: " followed by a short, plain explanation of why.

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
export async function draftDocument(documentType: string, description: string): Promise<DraftResult> {
  if (!DOCUMENT_TYPES.some((t) => t.id === documentType)) {
    return { error: "Choose a document type." };
  }
  const descriptionError = validateDescription(description);
  if (descriptionError) return { error: descriptionError };

  let raw = "";
  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: PROMPT(documentType as DraftDocumentType, description.trim()) }],
    });
    raw = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
  } catch (err) {
    console.error("Anthropic document drafting failed", err);
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
