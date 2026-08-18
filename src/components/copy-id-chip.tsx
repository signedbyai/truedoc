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
import { useState } from "react";

export function CopyIdChip({ value, label = "Copy ID" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Best-effort — the ID is still visible on screen to copy by hand.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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
