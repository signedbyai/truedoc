"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Locked variant of HeroCardLink for a mode the org's plan doesn't include
// (currently just Draft on sub-Pro+ plans). Same dashed-border/grey-icon/
// click-for-popover pattern as the New document page's own locked Draft
// tab (new-document-client.tsx's draftLockedPopoverOpen) — a hero card
// that silently linked to the picker would land the user back on the Sign
// panel with no explanation (the picker falls back to Sign for a locked
// mode rather than erroring), which reads as a broken link. This makes the
// lock explicit instead, in the same words and with the same /pricing
// link the tab already uses.
export function LockedHeroCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-left transition hover:border-slate-400"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
          <Icon className="h-5 w-5 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-400">{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-400">{description}</p>
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
