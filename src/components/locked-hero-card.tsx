"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

// Locked variant of HeroCardLink for a mode the org's plan doesn't include
// (currently just Draft on sub-Pro+ plans). Same dashed-border/grey-icon/
// click-for-popover pattern as the New document page's own locked Draft
// tab (new-document-client.tsx's draftLockedPopoverOpen) — a hero card
// that silently linked to the picker would land the user back on the Sign
// panel with no explanation (the picker falls back to Sign for a locked
// mode rather than erroring), which reads as a broken link. This makes the
// lock explicit instead, in the same words and with the same /pricing
// link the tab already uses.
//
// The icon is imported directly here rather than taken as a prop
// (2026-08-21, hotfix) — this component is "use client", and its caller
// (documents/page.tsx) is a Server Component; passing a component
// reference like a lucide-react icon across that boundary as a prop isn't
// serializable and crashed the page in production ("Functions cannot be
// passed directly to Client Components", digest 1621801304). Sparkles is
// the only icon this card has ever needed (Draft is the only gated mode),
// so hardcoding it here removes the crash rather than working around it.
//
// Same mobile layout as HeroCardLink (2026-08-21, direct ask, then a
// same-day follow-up) — centered icon-over-text below sm, horizontal at
// sm+, kept in sync so the two cards in this row don't visibly diverge at
// any width. Icon/title/description sizes are the same at every width now
// (the first pass also shrank them below sm and it read as too small).
//
// The <button> carries h-full (2026-08-21, direct ask) — this component's
// outer element is a plain <div> (needed as the positioning root for the
// popover below), so unlike HeroCardLink (whose <Link> IS the grid item
// and stretches to the row height by default), the grid's height-stretch
// only reached that outer wrapper, not the visibly-bordered <button>
// inside it — Draft ended up shorter than Quote whenever Quote's
// description ran to more lines. h-full makes the button fill the
// stretched wrapper so both cards in a row match height regardless of
// how many lines either description wraps to.
//
// Description bumped text-xs -> text-sm alongside HeroCardLink
// (2026-08-21, direct ask, after trimming the Quote/Seal copy shorter) —
// kept in sync with HeroCardLink so paired cards in the same row never
// show mismatched type sizes.
export function LockedHeroCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-full w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center transition hover:border-slate-400 sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:text-left"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
          <Sparkles className="h-5 w-5 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-400">{title}</p>
          <p className="mt-0.5 text-sm leading-snug text-slate-400">{description}</p>
        </div>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-lg sm:left-auto sm:right-0 sm:w-44">
            <p className="text-xs font-normal leading-snug text-slate-600">
              {title} is available on{" "}
              <Link href="/pricing" className="font-medium text-slate-900 underline hover:text-slate-600">
                Pro+
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
