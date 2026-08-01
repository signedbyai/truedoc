import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Org-level Stripe Identity (VERIFIED_BADGE_SCOPE.md's self-sign pivot,
// decision 6) — deliberately NOT the same thing as STRIPE_IDENTITY_SCOPE.md's
// per-signer, per-document design (signers.identity_verified_at etc.). That
// scoped-but-not-built feature verifies one recipient on one document; this
// verifies the org once and reuses it across many future Verified Badge
// seals, since a fresh ID-scan-plus-selfie check on every seal is cost-
// negative against a $0.25/document Console price. See migration 0042 for
// the organizations columns this reads/writes.

// How long a verified session stays reusable before a fresh check is asked
// for (VERIFIED_BADGE_SCOPE.md's one remaining open question, resolved with
// a concrete default rather than left open): 365 days. Roughly matches
// typical KYC re-verification windows — generous enough that a working
// freelancer isn't rescanning their ID every few weeks, while still
// bounding how old a "verified on [date]" claim can get before the ledger
// page and Settings start asking for a redo. A SignedBy-side policy choice,
// not something Stripe itself expires sessions on — revisit once real usage
// exists to design against.
export const VERIFICATION_FRESHNESS_DAYS = 365;

export type OrgIdentityStatus =
  | { verified: false }
  | { verified: true; name: string; verifiedAt: string; stale: boolean };

/** Pure computation of staleness, split out from getOrgIdentityStatus so
 *  it's unit-testable without a Supabase client (same extract-the-pure-part
 *  precedent as parseExpiresAt in console-actions.ts). */
export function resolveIdentityStatus(org: {
  identity_verified_at: string | null;
  identity_verified_name: string | null;
}): OrgIdentityStatus {
  if (!org.identity_verified_at || !org.identity_verified_name) return { verified: false };
  const verifiedAt = new Date(org.identity_verified_at);
  const ageDays = (Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
  return {
    verified: true,
    name: org.identity_verified_name,
    verifiedAt: org.identity_verified_at,
    stale: ageDays > VERIFICATION_FRESHNESS_DAYS,
  };
}

export async function getOrgIdentityStatus(orgId: string): Promise<OrgIdentityStatus> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("identity_verified_at, identity_verified_name")
    .eq("id", orgId)
    .single();
  if (!org) return { verified: false };
  return resolveIdentityStatus(org);
}

/** Creates a Stripe Identity VerificationSession scoped to this org
 *  (org_id stashed in metadata, same pattern STRIPE_IDENTITY_SCOPE.md
 *  describes for its per-signer sessions) and returns the client_secret
 *  the frontend needs to open Stripe's own hosted verification modal
 *  (@stripe/stripe-js's stripe.verifyIdentity(clientSecret) — no custom UI
 *  for the actual document-scan/liveness step). Server-side creation only:
 *  required, since client-side creation would let anyone rack up
 *  verification charges on the account. */
export async function startOrgIdentityVerification(orgId: string): Promise<{ clientSecret: string }> {
  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { org_id: orgId },
    options: { document: { require_matching_selfie: true } },
  });

  if (!session.client_secret) {
    throw new Error("Stripe did not return a client secret for the verification session.");
  }

  const admin = createAdminClient();
  await admin
    .from("organizations")
    .update({ stripe_identity_verification_session_id: session.id })
    .eq("id", orgId);

  return { clientSecret: session.client_secret };
}
