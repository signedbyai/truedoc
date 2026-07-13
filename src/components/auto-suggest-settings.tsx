"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Org-wide preference for whether AI field-placement suggestions run
// automatically on a brand-new document's upload (off by default) — see
// src/app/api/org/auto-suggest/route.ts and field-editor.tsx's auto-run
// effect. The manual "Suggest fields" button in the field editor always
// works regardless of this setting.
export function AutoSuggestSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function toggle(next: boolean) {
    setEnabled(next);
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/org/auto-suggest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setEnabled(!next); // revert the optimistic flip
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={enabled}
          disabled={status === "loading"}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-medium text-slate-900">Automatically suggest fields on upload</span>
          <br />
          When someone on your team uploads a new document, scan it right away and place suggested signature, date,
          and initials fields for review. You can always run this manually with the &quot;Suggest fields&quot; button
          in the field editor either way.
        </span>
      </label>
      {status === "loading" && <p className="pl-6 text-xs text-slate-500">Saving…</p>}
      {error && <p className="pl-6 text-xs text-red-600">{error}</p>}
    </div>
  );
}
