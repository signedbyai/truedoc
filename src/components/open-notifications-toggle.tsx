"use client";

import { useState } from "react";

// Per-document mute for the "signer just opened" sender email (V3 #8) —
// lives on the doc detail page (the same place the email's footer link
// points). Optimistic flip with rollback on failure; a settings toggle
// this small doesn't warrant a loading state.
export function OpenNotificationsToggle({
  documentId,
  initialEnabled,
}: {
  documentId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState(false);

  async function toggle(next: boolean) {
    setEnabled(next);
    setError(false);
    const res = await fetch(`/api/documents/${documentId}/open-notifications`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setEnabled(!next);
      setError(true);
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => toggle(e.target.checked)}
        className="h-3.5 w-3.5"
      />
      Email me when a signer first opens this document
      {error && <span className="text-red-600">— couldn&apos;t save, try again</span>}
    </label>
  );
}
