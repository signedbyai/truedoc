"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Org-wide "ask me every time" vs "always use last position" toggle
// (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.1) — same
// optimistic-flip-then-revert-on-error shape as AutoSuggestSettings,
// PATCHing /api/org/badge-placement instead. Opt-in, not opt-out: "Always
// use last position" (organizations.badge_placement_mode = "skip") is the
// default and the radio pre-selected for every org that's never touched
// this — sealing behaves exactly as it did before this feature existed.
export function BadgePlacementSettings({ initialMode }: { initialMode: "ask" | "skip" }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function setModeAndSave(next: "ask" | "skip") {
    const prev = mode;
    setMode(next);
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/org/badge-placement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setMode(prev);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-2">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-900">Badge placement</legend>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input
            type="radio"
            name="badge-placement-mode"
            checked={mode === "skip"}
            disabled={status === "loading"}
            onChange={() => setModeAndSave("skip")}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="font-medium text-slate-900">Always use last position</span> (default)
            <br />
            Seal instantly — the badge lands wherever you last placed it, or the bottom-right corner if you never have.
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input
            type="radio"
            name="badge-placement-mode"
            checked={mode === "ask"}
            disabled={status === "loading"}
            onChange={() => setModeAndSave("ask")}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="font-medium text-slate-900">Ask me every time</span>
            <br />
            Show a &quot;Badge placement&quot; step before each seal, so you can drag the badge to exactly where you
            want it — useful if you seal invoices or portfolios where placement actually matters.
          </span>
        </label>
      </fieldset>
      {status === "loading" && <p className="text-xs text-slate-500">Saving…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
