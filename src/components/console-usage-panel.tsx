"use client";

import { useState } from "react";
import type { ConsoleBillingState } from "@/lib/console-usage";

// Meter + spend-cap controls for /dashboard/console (CONSOLE_UX_SCOPE.md).
// The numbers come from the server component's initial fetch (getConsoleBillingState)
// — this component doesn't poll; ConsoleChat calls router.refresh() after a
// confirmed send, which re-fetches the parent server component and passes
// fresh props back down here.

export function ConsoleUsagePanel({
  initialState,
  initialCapEnabled,
  initialCapCents,
  showIntro,
}: {
  initialState: ConsoleBillingState;
  initialCapEnabled: boolean;
  initialCapCents: number;
  showIntro: boolean;
}) {
  const [capEnabled, setCapEnabled] = useState(initialCapEnabled);
  const [capDollars, setCapDollars] = useState((initialCapCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [introOpen, setIntroOpen] = useState(showIntro);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch("/api/org/console-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleCap() {
    const next = !capEnabled;
    setCapEnabled(next);
    void patch({ capEnabled: next });
  }

  function saveCapAmount() {
    const dollars = parseFloat(capDollars);
    if (!Number.isFinite(dollars) || dollars < 1) return;
    void patch({ capCents: Math.round(dollars * 100) });
  }

  function dismissIntro() {
    setIntroOpen(false);
    void patch({ introSeen: true });
  }

  const capCents = Math.round((parseFloat(capDollars) || 0) * 100);
  const barPct = capCents > 0 ? Math.min(100, (initialState.billCents / capCents) * 100) : 0;

  return (
    // Same dark, low-chrome panel treatment as console-chat.tsx — thin
    // border + a barely-there fill instead of a white card, matching the
    // 2026-07-31 reference (Claude's own chat UI: near-black, minimal
    // panel boundaries, no bright white anywhere).
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-medium text-neutral-300">This period</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-xs text-neutral-500">Units sent</p>
            <p className="mt-0.5 text-xl font-semibold text-white">{initialState.unitsUsed}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-xs text-neutral-500">Bill so far</p>
            <p className="mt-0.5 text-xl font-semibold text-white">${(initialState.billCents / 100).toFixed(2)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {initialState.freeAllowance} free + {initialState.billableUnits} billable at $0.25 each
        </p>
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-300">Spend cap</p>
          <button
            type="button"
            role="switch"
            aria-checked={capEnabled}
            aria-label="Toggle spend cap"
            onClick={toggleCap}
            disabled={saving}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${capEnabled ? "bg-yellow-300" : "bg-white/10"}`}
          >
            {/* Explicit left-0.5 + top-1/2/-translate-y-1/2 (2026-07-31,
                fixing a malformed/oversized-looking thumb) — the previous
                version anchored only `top-0.5` with no `left`, so the
                thumb's un-set horizontal offset defaulted to the browser's
                own "auto" static-position resolution instead of a fixed
                2px inset, which rendered inconsistently (the thumb reading
                as bigger than the track and overflowing its right edge).
                Both translate-x and translate-y compose into one
                transform via Tailwind's CSS-variable-based translate
                utilities, so combining them here is safe. */}
            <span
              className={`absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-transform ${capEnabled ? "translate-x-4" : "translate-x-0"} ${capEnabled ? "" : "bg-neutral-400"}`}
            />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-sm text-neutral-500">$</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={capDollars}
            onChange={(e) => setCapDollars(e.target.value)}
            onBlur={saveCapAmount}
            disabled={!capEnabled}
            className="w-24 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-300/40 disabled:text-neutral-500"
          />
          <span className="text-xs text-neutral-500">per month</span>
        </div>

        {capEnabled && (
          <>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${barPct >= 100 ? "bg-red-500" : barPct >= 80 ? "bg-amber-400" : "bg-yellow-300"}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">
              ${(initialState.billCents / 100).toFixed(2)} of ${(capCents / 100).toFixed(2)} used — sends pause automatically at
              the cap
            </p>
          </>
        )}

        {introOpen && (
          <div className="absolute left-1/2 top-full z-10 mt-3 w-72 -translate-x-1/2">
            {/* Small caret so this reads as attached to the toggle above it
                instead of a stray card floating below — the thing this
                popover looked like before this pass. */}
            <div className="mx-auto h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-l border-t border-white/10 bg-neutral-900" />
            <div className="-mt-1.5 rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-2xl shadow-black/60">
              <p className="text-sm font-medium text-white">What&apos;s the spend cap?</p>
              <p className="mt-1 text-xs text-neutral-400">
                Every Pro/Team console starts with a $25/month cap on metered overage — you&apos;ll get a warning at
                80%, and sends pause automatically if you hit it. Raise it, lower it, or turn it off any time.
              </p>
              <button
                type="button"
                onClick={dismissIntro}
                className="mt-3 text-xs font-medium text-yellow-300 underline hover:text-yellow-200"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
