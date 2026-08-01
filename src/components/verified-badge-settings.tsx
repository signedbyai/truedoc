"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Verified Badge's two Settings additions (VERIFIED_BADGE_SCOPE.md), living
// in Console's own Settings tab (console-workspace.tsx's settingsBody) —
// moved here 2026-08-01 from /dashboard/settings after direct feedback:
// unlike the API key (also used by the plain /api/v1 REST API, dashboard-
// wide), Verified Badge is Console/MCP-only — every bit of its activity
// happens in Console, so sending someone to the separate dashboard just to
// verify their identity was unnecessary friction this feature was supposed
// to avoid. Styled to match ConsoleUsagePanel/ConsolePlanStatus's dark,
// low-chrome panel treatment, not the light dashboard Card these came from.
//
// 1. Identity status + manual re-verify — Console has no other UI surface
//    for this; this panel is the only place a human ever sees "am I
//    verified" or can redo the check.
// 2. The appended/separate/both preference — "ask me every time" (default,
//    Console's chat asks conversationally) vs. one standing choice that
//    skips the question.
//
// Needs NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set (client-side Stripe.js) —
// distinct from the existing server-side STRIPE_SECRET_KEY, which this
// project has never needed a publishable counterpart for until now.

let stripeClientPromise: Promise<Stripe | null> | null = null;
function getStripeClient() {
  if (!stripeClientPromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripeClientPromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripeClientPromise;
}

type CertificateMode = "ask" | "appended" | "separate" | "both";

export function VerifiedBadgeSettings({
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
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-medium text-neutral-300">Verified Badge identity</p>
        {identityVerified ? (
          <p className="mt-1.5 text-xs text-neutral-400">
            Verified: <span className="font-medium text-white">{identityVerifiedName}</span>
            {identityVerifiedAt && `, ${new Date(identityVerifiedAt).toLocaleDateString()}`}
            {identityStale && <span className="ml-1.5 font-medium text-amber-400">— due for a refresh</span>}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-neutral-500">Not yet verified — required before your first seal.</p>
        )}
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={startVerification}
          disabled={verifying}
          className="mt-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10 disabled:opacity-50"
        >
          {verifying ? "Opening verification…" : identityVerified ? "Redo verification" : "Verify identity"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <label htmlFor="certificate-mode" className="block text-sm font-medium text-neutral-300">
          Certificate style
        </label>
        <p className="mt-1.5 text-xs text-neutral-500">
          What Console asks (or skips asking) each time you seal a document — appended into the file, kept as a
          separate certificate, or both.
        </p>
        <select
          id="certificate-mode"
          value={mode}
          onChange={(e) => saveCertificateMode(e.target.value as CertificateMode)}
          disabled={savingMode}
          className="mt-2.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-300/40 disabled:text-neutral-500"
        >
          <option className="bg-neutral-900" value="ask">
            Ask me every time
          </option>
          <option className="bg-neutral-900" value="appended">
            Always appended
          </option>
          <option className="bg-neutral-900" value="separate">
            Always separate
          </option>
          <option className="bg-neutral-900" value="both">
            Always both
          </option>
        </select>
      </div>
    </div>
  );
}
