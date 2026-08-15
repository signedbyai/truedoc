import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { attributionPayloadSchema, recordOrgAttribution, type AttributionPayload } from "@/lib/attribution";

// Server-side hand-off for first-touch attribution across a browser change.
// See 0055_pending_attribution.sql for the full root-cause writeup: the
// localStorage-based capture/claim pair only survives when the ad landing and
// the signup happen in the same browser, and the magic-link path on mobile
// (Reddit in-app webview -> mail app -> Safari/Chrome) never does.
//
// sendMagicLink writes here at the moment the email is submitted (the last
// point where the ORIGINAL browser is still in play); the first successful
// login for that address claims it. Nothing client-side has to persist, so
// any number of browser or device hops in between are fine.

// Rows older than this are ignored at claim time and swept on the next write.
// 30 days matches how long someone might plausibly sit on an unopened magic
// link before finishing signup, without keeping staging rows indefinitely.
const MAX_AGE_DAYS = 30;

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

// Best-effort throughout: attribution is analytics, and must never be able to
// block or fail a real sign-in. Every failure path here is swallowed.
export async function storePendingAttribution(email: string, rawPayload: unknown): Promise<void> {
  try {
    // The login form sends this as a JSON string in a hidden field (FormData
    // can only carry strings), so accept either that or an already-parsed
    // object and normalize here rather than at the call site.
    let candidate: unknown = rawPayload;
    if (typeof candidate === "string") {
      if (!candidate) return;
      try {
        candidate = JSON.parse(candidate);
      } catch {
        return;
      }
    }
    if (!candidate || typeof candidate !== "object") return;

    const parsed = attributionPayloadSchema.safeParse(candidate);
    // No utm_source means there's nothing worth attributing — same bar the
    // capture endpoint applies, so an organic/direct signup doesn't create a
    // row that would later "claim" nothing.
    if (!parsed.success || !parsed.data.utm_source) return;

    const admin = createAdminClient();
    await admin.from("pending_attribution").upsert(
      {
        email_hash: hashEmail(email),
        payload: parsed.data,
        created_at: new Date().toISOString(),
      },
      { onConflict: "email_hash" }
    );

    // Opportunistic retention sweep — no cron needed for a table this small,
    // and it keeps the expiry rule in the same file as the rule it enforces.
    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("pending_attribution").delete().lt("created_at", cutoff);
  } catch (err) {
    console.error("storePendingAttribution failed", err);
  }
}

// Called on a genuine first login only (isFirstLogin), from the same three
// completion paths recordSignupOriginHost uses. Looks up the org via
// organization_members with the admin client rather than getUserAndOrg(),
// for the same reason signup-origin.ts does: the cookie-bound client isn't
// reliably populated inside the same action/route that just created the
// session.
export async function claimPendingAttribution(userId: string, email: string | undefined): Promise<void> {
  if (!email) return;
  try {
    const admin = createAdminClient();
    const emailHash = hashEmail(email);

    const { data: row } = await admin
      .from("pending_attribution")
      .select("payload, created_at")
      .eq("email_hash", emailHash)
      .maybeSingle();
    if (!row) return;

    // Always delete, even if the row turns out to be too old or unusable —
    // it has served its only purpose and shouldn't linger.
    await admin.from("pending_attribution").delete().eq("email_hash", emailHash);

    const ageMs = Date.now() - new Date(row.created_at).getTime();
    if (ageMs > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return;

    const parsed = attributionPayloadSchema.safeParse(row.payload);
    if (!parsed.success) return;

    const { data: membership } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!membership) return;

    await recordOrgAttribution(membership.org_id, parsed.data as AttributionPayload);
  } catch (err) {
    console.error("claimPendingAttribution failed", err);
  }
}
