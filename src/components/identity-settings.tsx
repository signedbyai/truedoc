"use client";

// Light-themed twin of verified-badge-settings.tsx's identity half
// (2026-08-05 follow-up to VERIFIED_BADGE_DASHBOARD_SCOPE.md) — same
// identity-status/re-verify control, same underlying data/endpoint
// (/api/org/identity/start), styled as an ordinary /dashboard/settings Card
// instead of Console's dark chat-surface panel. That original panel moved
// OUT of /dashboard/settings on 2026-08-01 because Verified Badge was
// Console/MCP-only then — every bit of sealing activity happened in
// Console, so a separate dashboard page just to verify your identity was
// an extra hop. That premise is gone: sealing is a dashboard-native New
// Document tab now, and every plan (including Free, via its own
// 3-seals/month pool) can reach it, so identity verification needs a home
// here too — not just Console's Settings tab (kept, by direct decision, as
// a second surface over the same org-level data) or the inline card that
// only appears mid-seal if you're not verified yet.
//
// No certificate-style control here (removed 2026-08-05, direct ask, same
// day it was added) — the dashboard's own Seal a file tab always produces
// both an appended and a separate certificate now
// (api/documents/[id]/seal/route.ts hardcodes certificateMode: "both"),
// so there's nothing left to choose from this surface. Console keeps its
// own dropdown + conversational ask untouched, per direct instruction —
// this was a dashboard-only simplification, not a product-wide one.
//
// Deliberately not gated to any plan/hasConsoleAccess check the way
// Console's own copy is — sealing itself is free-plan-reachable now, so
// gating identity verification behind a paid plan here would block exactly
// the org this page is trying to help.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getStripeClient } from "@/lib/stripe-client";

export function IdentitySettings({
  identityVerified,
  identityVerifiedName,
  identityVerifiedAt,
  identityStale,
}: {
  identityVerified: boolean;
  identityVerifiedName: string | null;
  identityVerifiedAt: string | null;
  identityStale: boolean;
}) {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

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
    </div>
  );
}
