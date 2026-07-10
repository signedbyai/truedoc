"use client";

import { useState } from "react";

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

  if (state === "sent") return <span className="text-xs text-emerald-600">Reminder sent</span>;

  return (
    <button
      onClick={handleRemind}
      disabled={state === "sending"}
      className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
    >
      {state === "sending" ? "Sending…" : state === "error" ? "Couldn't send — retry" : "Send reminder"}
    </button>
  );
}
