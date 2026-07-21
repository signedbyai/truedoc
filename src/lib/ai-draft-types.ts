// Shared between the client (the "describe it" form) and the server
// (draft-document.ts's prompt-building) — pure data/strings, no Anthropic
// SDK or other server-only imports, so it's safe in either bundle.

import { SUMMARY_LANGUAGES } from "@/lib/summary-languages";

export type DraftDocumentType =
  | "freelance"
  | "nda"
  | "waiver"
  | "general"
  | "phone_repair"
  | "boiler_maintenance"
  | "bike_rental";

// `labelNl` is an optional Dutch-specific override — used for the two
// templates (boiler/CV, bike/fiets) where the Dutch trade term reads more
// naturally than a translated English one. Only shown when the template
// maker's language is set to Dutch (see documentTypeLabel below); every
// other language falls back to the plain English `label`.
export const DOCUMENT_TYPES: { id: DraftDocumentType; label: string; labelNl?: string; placeholder: string }[] = [
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
  {
    id: "phone_repair",
    label: "Phone Repair Agreement",
    placeholder: "e.g. iPhone 13 screen replacement, $150 flat rate, 90-day warranty on the part",
  },
  {
    id: "boiler_maintenance",
    label: "Boiler Maintenance Agreement",
    labelNl: "CV-onderhoudscontract",
    placeholder: "e.g. annual boiler service contract, one inspection per year plus emergency call-outs, €180/year",
  },
  {
    id: "bike_rental",
    label: "Bike Rental Agreement",
    labelNl: "Fietsverhuurovereenkomst",
    placeholder: "e.g. weekend bike rental, €50 refundable deposit, renter liable for damage or theft",
  },
];

// languageCode is optional and only changes anything for the two templates
// above that define a labelNl — pass the template maker's current draft
// language in to get the Dutch trade term; every other id/language
// combination returns the same plain-English label as before.
export function documentTypeLabel(id: string, languageCode?: string): string {
  const type = DOCUMENT_TYPES.find((t) => t.id === id);
  if (!type) return "Document";
  if (languageCode === "nl" && type.labelNl) return type.labelNl;
  return type.label;
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

// A curated *subset* of SUMMARY_LANGUAGES (see summary-languages.ts) — not
// the full list. Reason: a draft's title/body get rendered into a real PDF
// by text-to-pdf.ts using pdf-lib's built-in Helvetica standard font, which
// only supports the WinAnsi (Windows-1252) character set. Western European
// Latin script (this list) fits inside that; Polish's diacritics (ą ć ę ł
// ń ó ś ź ż) fall outside WinAnsi, and Chinese/Arabic/Hindi/Japanese aren't
// Latin-script at all. Requesting one of those would make pdf-lib throw a
// WinAnsi-encoding error inside textToPdf(), which the finalize route would
// surface as a generic "Couldn't create the PDF" failure — after the
// sender already reviewed a draft, which is a worse failure mode than not
// offering the option at all. If text-to-pdf.ts ever gains real Unicode
// font embedding (fontkit + bundled fonts, RTL shaping for Arabic,
// CJK-aware word wrap), this list can grow to match SUMMARY_LANGUAGES.
const DRAFT_LANGUAGE_CODES = ["en", "es", "fr", "de", "pt", "nl", "it"];

export const DRAFT_LANGUAGES: { code: string; label: string }[] = SUMMARY_LANGUAGES.filter((l) =>
  DRAFT_LANGUAGE_CODES.includes(l.code)
);

const DRAFT_LANG_CODES = new Set(DRAFT_LANGUAGES.map((l) => l.code));

export function isSupportedDraftLang(code: string): boolean {
  return DRAFT_LANG_CODES.has(code);
}

export function draftLanguageLabel(code: string): string {
  return DRAFT_LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}

// Same locale → code mapping as detectSummaryLang, but clamped to the
// narrower draft-safe set above (e.g. a Chinese browser locale falls back
// to English here even though the summary feature would honor it).
export function detectDraftLang(locale: string | undefined | null): string {
  if (!locale) return "en";
  const primary = locale.split("-")[0].toLowerCase();
  return isSupportedDraftLang(primary) ? primary : "en";
}
