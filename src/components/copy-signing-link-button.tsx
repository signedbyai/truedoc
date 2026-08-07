"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

// Fallback for the case an automated reminder/invite email never reaches a
// signer (spam filter, corporate mail gateway, typo caught after the fact,
// etc.) — lets the sender grab the exact same link and hand it to the
// signer directly (Slack, text, in person). Available on every plan since
// it doesn't send anything, just reveals a link that already exists.
export function CopySigningLinkButton({ signingToken }: { signingToken: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    const link = `${window.location.origin}/sign/${signingToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    // Mini icon added (2026-08-08, direct ask) -- matches ShareSigningLinkButton/
    // QrSigningLinkButton's own icon treatment in signer-row.tsx, so all three
    // sit consistently rather than only two of three having one.
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
    >
      <Copy className="h-3 w-3" aria-hidden="true" />
      {state === "copied" ? "Link copied" : state === "error" ? "Couldn't copy" : "Copy link"}
    </button>
  );
}
