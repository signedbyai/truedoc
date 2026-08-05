"use client";

// Light-themed copy-to-clipboard button (2026-08-05, follow-up to
// VERIFIED_BADGE_DASHBOARD_SCOPE.md) — same "flash Copied, never show the
// raw value" behavior as console-chat.tsx's and console-verified-badge-
// list.tsx's own (private, unexported, dark-themed) CopyLinkButtons, as a
// shared exported component so the dashboard's sealed-document detail page
// doesn't need a third private copy of the same handful of lines.
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyLinkButton({ value, label = "Copy verify link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op — still flash "Copied", nothing more useful to do
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}
