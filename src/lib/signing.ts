import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSpeedStat, type SpeedStat } from "@/lib/speed-stat";

type AdminClient = ReturnType<typeof createAdminClient>;

// Personal "you signed this in X seconds" stat for the completion screen.
// Best-effort by design: a signer's flow must never depend on it, so any
// failure resolves to null. Shared by the submit route (fresh signature),
// its idempotent replay path, and the status endpoint (recovery poll) so
// all three return the same stat.
export async function fetchSignerSpeedStat(admin: AdminClient, signerId: string): Promise<SpeedStat | null> {
  try {
    const { data: speedRows, error } = await admin.rpc("get_signer_speed_stat", { p_signer_id: signerId });
    if (error) throw error;
    const row = speedRows?.[0];
    return buildSpeedStat({
      activeSeconds: row?.active_seconds ?? null,
      percentile: row?.percentile ?? null,
      sampleSize: row?.sample_size ?? null,
    });
  } catch (err) {
    console.error("get_signer_speed_stat failed", err);
    return null;
  }
}

// Shared lookup for the signer-facing flow. The signer proves identity via
// an unguessable `signing_token` (no Supabase auth session), so every route
// here goes through the service-role admin client and bypasses RLS —
// access control is entirely "do you know the token."
export async function getSignerByToken(token: string) {
  const admin = createAdminClient();

  const { data: signer } = await admin
    .from("signers")
    .select(
      "id, document_id, name, email, order_index, status, signed_at, docgate_code, auth_required, auth_verified_at"
    )
    .eq("signing_token", token)
    .single();

  if (!signer) return null;

  const { data: document } = await admin
    .from("documents")
    .select(
      "id, title, page_count, org_id, owner_id, status, payment_link_url, payment_label, docgate_url, docgate_label, open_notifications, expires_at"
    )
    .eq("id", signer.document_id)
    .single();

  if (!document) return null;

  return { admin, signer, document };
}

// Found 2026-07-30: a document could still be opened and signed minutes
// after its expires_at passed, because the ONLY thing that ever flips a
// "sent" document to the 'expired' terminal status was the daily reminders
// cron (src/app/api/cron/reminders/route.ts) — a document expiring at 09:00
// stayed fully signable until that cron's next run, up to ~24h later. Every
// signer-facing route that gates on `document.status === "expired"` needs to
// ALSO treat a past-due expires_at as expired immediately, not just wait for
// the cron to catch up — this shared check is what both
// sign/[token]/page.tsx and sign/[token]/submit/route.ts call, so the two
// can't drift out of sync with each other the way page.tsx and the old
// api/sign/[token]/route.ts drifted on the viewed-webhook bug.
export function isPastExpiration(document: { status: string; expires_at: string | null }): boolean {
  return document.status === "sent" && Boolean(document.expires_at) && new Date(document.expires_at!) <= new Date();
}

/**
 * Fix for the 2026-07-25 audit finding (DOCUMENT_DELIVERY_SECURITY_AUDIT.md):
 * per-recipient email-OTP verification (signer.auth_required/auth_verified_at,
 * PER_RECIPIENT_AUTH_SCOPE.md) used to be checked ONLY inside
 * sign/[token]/page.tsx's render — none of the API routes that page's client
 * components call re-checked it, so anyone holding a signer's raw
 * signing_token could bypass the "Confirm it's you" code challenge entirely
 * via direct API calls (confirmed with a real reproduction test).
 *
 * Every signer-facing API route that returns document content or lets the
 * signer act — view, file, signed-file, summary, submit, decline, status,
 * the page-view beacon, payment-click — MUST call this immediately after
 * getSignerByToken() and return its result if non-null. The two exceptions
 * are /auth/request and /auth/verify: those have to work BEFORE verification,
 * since completing them is how a signer becomes verified in the first place.
 * sign/[token]/page.tsx also doesn't call this — it needs the unverified
 * signer's own data to render the SignerAuthGate screen, and already does
 * the equivalent check inline for that one purpose.
 */
export function requireVerifiedSigner(signer: { auth_required: boolean; auth_verified_at: string | null }) {
  if (signer.auth_required && !signer.auth_verified_at) {
    return NextResponse.json({ error: "Verify your identity to continue.", authRequired: true }, { status: 401 });
  }
  return null;
}
