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
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-900">This period</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Units sent</p>
            <p className="mt-0.5 text-xl font-semibold text-slate-900">{initialState.unitsUsed}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Bill so far</p>
            <p className="mt-0.5 text-xl font-semibold text-slate-900">${(initialState.billCents / 100).toFixed(2)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {initialState.freeAllowance} free + {initialState.billableUnits} billable at $0.25 each
        </p>
      </div>

      <div className="relative rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900">Spend cap</p>
          <button
            type="button"
            role="switch"
            aria-checked={capEnabled}
            aria-label="Toggle spend cap"
            onClick={toggleCap}
            disabled={saving}
            className={`relative h-5 w-9 rounded-full transition-colors ${capEnabled ? "bg-slate-900" : "bg-slate-200"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${capEnabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-sm text-slate-500">$</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={capDollars}
            onChange={(e) => setCapDollars(e.target.value)}
            onBlur={saveCapAmount}
            disabled={!capEnabled}
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <span className="text-xs text-slate-500">per month</span>
        </div>

        {capEnabled && (
          <>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barPct >= 100 ? "bg-red-500" : barPct >= 80 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              ${(initialState.billCents / 100).toFixed(2)} of ${(capCents / 100).toFixed(2)} used — sends pause automatically at
              the cap
            </p>
          </>
        )}

        {introOpen && (
          <div className="absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="text-sm font-medium text-slate-900">What&apos;s the spend cap?</p>
            <p className="mt-1 text-xs text-slate-600">
              Every Pro/Team console starts with a $25/month cap on metered overage — you&apos;ll get a warning at
              80%, and sends pause automatically if you hit it. Raise it, lower it, or turn it off any time.
            </p>
            <button
              type="button"
              onClick={dismissIntro}
              className="mt-3 text-xs font-medium text-slate-700 underline hover:text-slate-900"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
