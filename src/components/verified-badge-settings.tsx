"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";

// Verified Badge's two Settings additions (VERIFIED_BADGE_SCOPE.md), same
// card, same "small status + one action" shape as the existing API key
// card (api-key-settings.tsx) this was explicitly modeled on:
//
// 1. Identity status + manual re-verify. Console has no other UI surface
//    for this (Console/MCP-only, no dashboard button) — Settings is the
//    only place a human ever sees "am I verified" or can redo the check.
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
      // org columns this card reads. Refreshing right away often won't
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
        {identityVerified ? (
          <p className="text-sm text-slate-600">
            Identity verified: <span className="font-medium text-slate-900">{identityVerifiedName}</span>
            {identityVerifiedAt && `, ${new Date(identityVerifiedAt).toLocaleDateString()}`}
            {identityStale && <span className="ml-1.5 font-medium text-amber-600">— due for a refresh</span>}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Not yet verified — required before your first Verified Badge seal.</p>
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={startVerification} disabled={verifying}>
          {verifying ? "Opening verification…" : identityVerified ? "Redo verification" : "Verify identity"}
        </Button>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <label htmlFor="certificate-mode" className="block text-sm font-medium text-slate-900">
          Certificate style
        </label>
        <p className="mt-0.5 text-xs text-slate-600">
          What Console asks (or skips asking) each time you seal a document — appended into the file, kept as a
          separate certificate, or both.
        </p>
        <select
          id="certificate-mode"
          value={mode}
          onChange={(e) => saveCertificateMode(e.target.value as CertificateMode)}
          disabled={savingMode}
          className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
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
