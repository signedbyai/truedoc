import { DRAFT_LANGUAGES } from "@/lib/ai-draft-types";

// Small pill row noting which languages a feature supports — added to
// /magic-quote 2026-07-25 after the Magic Quote language option shipped, so
// a Spanish/French/German/Dutch/Portuguese/Italian visitor can see their own
// language is supported without guessing. Static, not geo-customized: IP
// country is a poor proxy for language (a German visitor traveling, or an
// English speaker living in Spain, would get a message aimed at the wrong
// person) — same reasoning already applied to keeping AI Drafter/Magic
// Quote's own language default on navigator.language rather than geo. A
// plain list works for every visitor regardless of where they're browsing
// from, and is crawlable by search in a way dynamically-injected geo copy
// isn't.
//
// Sourced from DRAFT_LANGUAGES (ai-draft-types.ts) rather than a separate
// hardcoded list, so this can't silently drift if the supported-language set
// ever changes.
export function LanguageSupportRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="px-0.5 text-xs text-slate-500">Now available in:</span>
      {DRAFT_LANGUAGES.map((l) => (
        <span key={l.code} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {l.label}
        </span>
      ))}
    </div>
  );
}
