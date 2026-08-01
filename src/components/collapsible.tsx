"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// Generic collapsed-by-default section with a down-arrow toggle (2026-08-02,
// direct ask re: dashboard/settings' Integration & API card — the curl
// examples block is reference material, not the point of the card on first
// load, so it starts closed to keep the card compact until someone actually
// wants it. Kept generic/reusable rather than one-off to this card, since
// nothing about it is API-specific.
export function Collapsible({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-slate-900 hover:text-slate-600"
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
