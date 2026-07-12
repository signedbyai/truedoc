// Shared, fixed language list for the "what am I signing?" summary
// translation feature — deliberately a curated set, not free-text, so the
// per-document translation cache (documents.ai_summary_translations) stays
// bounded and every code we accept has a known, reliable display label to
// hand the model in the translate prompt. Covers the EU/Netherlands base
// (SPRK10) plus the languages most likely to matter for a small-business
// e-signature tool's signer base.
export const SUMMARY_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "it", label: "Italian" },
  { code: "pl", label: "Polish" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
];

const CODES = new Set(SUMMARY_LANGUAGES.map((l) => l.code));

export function isSupportedSummaryLang(code: string): boolean {
  return CODES.has(code);
}

export function summaryLanguageLabel(code: string): string {
  return SUMMARY_LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}

// Maps a browser locale string (e.g. "pt-BR", "en-US") to one of our
// supported codes, falling back to English. Client-only in practice (called
// with navigator.language), but kept pure/framework-free so it's testable
// on its own.
export function detectSummaryLang(locale: string | undefined | null): string {
  if (!locale) return "en";
  const primary = locale.split("-")[0].toLowerCase();
  return isSupportedSummaryLang(primary) ? primary : "en";
}
