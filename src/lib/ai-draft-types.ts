// Shared between the client (the "describe it" form) and the server
// (draft-document.ts's prompt-building) — pure data/strings, no Anthropic
// SDK or other server-only imports, so it's safe in either bundle.

export type DraftDocumentType = "freelance" | "nda" | "waiver" | "general";

export const DOCUMENT_TYPES: { id: DraftDocumentType; label: string; placeholder: string }[] = [
  {
    id: "freelance",
    label: "Freelance / Services Agreement",
    placeholder: "e.g. 3-month logo design project, $2,000 total, net-30, client owns final files",
  },
  {
    id: "nda",
    label: "Non-Disclosure Agreement (NDA)",
    placeholder: "e.g. mutual NDA before discussing a potential partnership with another company",
  },
  {
    id: "waiver",
    label: "Waiver / Release of Liability",
    placeholder: "e.g. release form for participants in a one-day photography workshop",
  },
  {
    id: "general",
    label: "General Agreement",
    placeholder: "e.g. a simple agreement for a one-time equipment rental between two small businesses",
  },
];

export function documentTypeLabel(id: string): string {
  return DOCUMENT_TYPES.find((t) => t.id === id)?.label ?? "Document";
}

// Shown before drafting, and re-affirmed (via the required checkbox) every
// time — this is the load-bearing legal-risk mitigation for this whole
// feature (see product_backlog.md's "AI-drafted documents" entry: "the real
// cost is liability framing, not build cost"). Deliberately mirrors how
// Rocket Lawyer/LawDepot frame their own template generators: plain
// starting point, not a substitute for an attorney, and the sender stays
// responsible for reviewing it. Kept as one exported string so the
// generate-step UI and the finalize-step UI both show identical wording.
export const AI_DRAFT_DISCLAIMER =
  "This drafts a starting document based on what you describe — it is not legal advice, and SignedBy is not a " +
  "law firm or a substitute for one. Read the draft carefully and edit anything that doesn't match your situation " +
  "before sending it. For high-stakes, unusual, or high-value agreements, have a licensed attorney review it " +
  "first. You're responsible for the document you ultimately send.";

export const AI_DRAFT_CHECKBOX_LABEL =
  "I understand this is an AI-generated starting draft, not legal advice, and I'm responsible for reviewing it " +
  "before sending.";
