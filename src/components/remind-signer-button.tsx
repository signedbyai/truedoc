"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";

export function RemindSignerButton({ documentId, signerId }: { documentId: string; signerId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleRemind() {
    setState("sending");
    try {
      const res = await fetch(`/api/documents/${documentId}/signers/${signerId}/remind`, { method: "POST" });
      if (!res.ok) throw new Error();
      setState("sent");
    } catch {
      setState("error");
    }
  }

  // Mini icons added (2026-08-08, direct ask) -- paper-airplane Send icon to
  // match the other signer-row actions' icon treatment, and a Check on the
  // terminal "sent" state for the same reason CopyLinkButton swaps to Check
  // on success rather than leaving it icon-less.
  if (state === "sent")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <Check className="h-3 w-3" aria-hidden="true" />
        Reminder sent
      </span>
    );

  return (
    <button
      onClick={handleRemind}
      disabled={state === "sending"}
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
    >
      <Send className="h-3 w-3" aria-hidden="true" />
      {state === "sending" ? "Sending…" : state === "error" ? "Couldn't send — retry" : "Send reminder"}
    </button>
  );
}
