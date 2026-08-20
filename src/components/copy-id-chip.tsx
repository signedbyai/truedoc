"use client";

// Small copy-to-clipboard chip for showing a raw ID (template ID, etc.)
// next to its human-readable name. Added 2026-08-18 per
// PIPEDRIVE_INTEGRATION_SCOPE.md's flagged gap: no copy-paste-friendly
// place in the dashboard to grab a template's ID for raw API/automation
// use (Pipedrive Automations, curl, etc. — anywhere that isn't Zapier/Make,
// which get a name-based dropdown instead). Same dense
// "<code> chip + small copy button" layout as webhook-settings.tsx's
// secret row, just generalized into a shared component instead of a third
// private copy of the same handful of lines.
//
// asMenuItem drops the visible <code> and renders as a single
// MENU_ITEM_CLASS row instead — used inside TemplateRowActions' kebab menu
// (2026-08-20 row-actions consistency pass). The raw ID isn't worth its
// own always-visible line there; copying it is still one tap away, it's
// just not shown on screen until you ask.
import { useState } from "react";
import { CopyIcon, MENU_ITEM_CLASS } from "@/components/ui/menu-item";
import { cn } from "@/lib/utils";

export function CopyIdChip({
  value,
  label = "Copy ID",
  asMenuItem = false,
}: {
  value: string;
  label?: string;
  asMenuItem?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Best-effort — the non-menu chip below still shows the ID on screen
      // to copy by hand; asMenuItem mode has no such fallback.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (asMenuItem) {
    return (
      <button type="button" onClick={copy} className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}>
        <CopyIcon />
        {copied ? "Copied" : label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <code className="truncate rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">{value}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-[11px] font-medium text-slate-400 hover:text-slate-700"
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
