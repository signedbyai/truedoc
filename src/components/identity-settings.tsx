"use client";

// Light-themed twin of verified-badge-settings.tsx (2026-08-05 follow-up to
// VERIFIED_BADGE_DASHBOARD_SCOPE.md) — same identity-status/re-verify and
// certificate-style controls, same underlying data and endpoints
// (/api/org/identity/start, /api/org/console-settings), styled as an
// ordinary /dashboard/settings Card instead of Console's dark chat-surface
// panel. That original panel moved OUT of /dashboard/settings on 2026-08-01
// because Verified Badge was Console/MCP-only then — every bit of sealing
// activity happened in Console, so a separate dashboard page just to verify
// your identity was an extra hop. That premise is gone: sealing is a
// dashboard-native New Document tab now, and every plan (including Free,
// via its own 3-seals/month pool) can reach it, so identity verification
// needs a home here too — not just Console's Settings tab (kept, by direct
// decision, as a second surface over the same org-level data) or the
// inline card that only appears mid-seal if you're not verified yet.
//
// Deliberately not gated to any plan/hasConsoleAccess check the way
// Console's own copy is — sealing itself is free-plan-reachable now, so
// gating identity verification behind a paid plan here would block exactly
// the org this page is trying to help.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getStripeClient } from "@/lib/stripe-client";

type CertificateMode = "ask" | "appended" | "separate" | "both";

export function IdentitySettings({
  identityVerified,
  identityVerifiedName,
  identityVerifiedAt,
  identityStale,
  initialCertificateMode,
}: {
  identityVerified: boolean;
  identityVerifiedName: string | null;
  identityVerifiedAt: string | null;
  identityStale: boolean;
  initialCertificateMode: CertificateMode;
}) {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<CertificateMode>(initialCertificateMode);
  const [savingMode, setSavingMode] = useState(false);

  async function startVerification() {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/org/identity/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start verification.");

      const stripe = await getStripeClient();
      if (!stripe) throw new Error("Identity verification isn't configured yet — contact support.");

      const result = await stripe.verifyIdentity(data.clientSecret);
      if (result.error) throw new Error(result.error.message || "Verification didn't complete.");

      // Stripe's own review (sometimes near-instant, sometimes a few
      // minutes for manual review) finishes asynchronously — the webhook
      // (src/app/api/webhooks/stripe/route.ts) is what actually sets the
      // org columns this panel reads. Refreshing right away often won't
      // show the update yet; that's expected, not a bug.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setVerifying(false);
    }
  }

  async function saveCertificateMode(next: CertificateMode) {
    const previous = mode;
    setMode(next);
    setSavingMode(true);
    try {
      const res = await fetch("/api/org/console-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateMode: next }),
      });
      if (!res.ok) setMode(previous);
    } catch {
      setMode(previous);
    } finally {
      setSavingMode(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-900">Verified Badge identity</p>
        {identityVerified ? (
          <p className="mt-1 text-xs text-slate-600">
            Verified: <span className="font-medium text-slate-900">{identityVerifiedName}</span>
            {identityVerifiedAt && `, ${new Date(identityVerifiedAt).toLocaleDateString()}`}
            {identityStale && <span className="ml-1.5 font-medium text-amber-600">— due for a refresh</span>}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">Not yet verified — required before your first seal.</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={startVerification}
          disabled={verifying}
          className="mt-2.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {verifying ? "Opening verification…" : identityVerified ? "Redo verification" : "Verify identity"}
        </button>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <label htmlFor="dashboard-certificate-mode" className="block text-sm font-medium text-slate-900">
          Certificate style
        </label>
        <p className="mt-1 text-xs text-slate-500">
          What Console and the MCP tool ask (or skip asking) each time you seal a document — appended into the file,
          kept as a separate certificate, or both. The dashboard&apos;s own Seal a file tab never asks; it just
          follows this preference, treating &quot;Ask me every time&quot; as &quot;Always both&quot;.
        </p>
        <select
          id="dashboard-certificate-mode"
          value={mode}
          onChange={(e) => saveCertificateMode(e.target.value as CertificateMode)}
          disabled={savingMode}
          className="mt-2.5 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:text-slate-400"
        >
          <option value="ask">Ask me every time</option>
          <option value="appended">Always appended</option>
          <option value="separate">Always separate</option>
          <option value="both">Always both</option>
        </select>
      </div>
    </div>
  );
}
