import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "@/lib/stripe";

// "Give a month, get a month" referral loop (V3 #9). One shared Stripe coupon
// powers both sides: a 100%-off, duration:once coupon created in the Stripe
// dashboard (same manual setup as the price IDs), its id in STRIPE_REFERRAL_COUPON.
// - Referred customer: coupon applied at their first checkout (first month free).
// - Referrer: same coupon applied to their subscription once the referred org
//   makes its first real payment (or stashed as pending_referral_reward if the
//   referrer is still on the free plan, redeemed at their next checkout).

// Unambiguous alphabet (no 0/O/1/I) so codes are easy to read aloud/retype.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 7): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function referralLink(code: string): string {
  return `${appUrl()}/?ref=${code}`;
}

export function referralCouponId(): string | undefined {
  return process.env.STRIPE_REFERRAL_COUPON || undefined;
}

export const REFERRAL_REWARD_LABEL = "1 month of Pro, free";

// Free-tier seal-credit referral reward (REFERRAL_SCOPE.md, 2026-08-03).
// Layered on top of "give a month, get a month" above, not replacing it —
// see 0046_referral_seal_credits.sql for why this deliberately never
// touches `referrals.status` (owned entirely by rewardReferrerOnFirstPayment
// in the Stripe webhook): a referred org that seals a Verified Badge
// document *and* later actually subscribes still triggers the old
// free-month reward too, since this program only ever writes reward_type/
// credits_granted/referred_credits_granted.
export const SEAL_CREDITS_STANDARD = 5;
export const SEAL_CREDITS_SUPER_REFERRER = 10; // 2x, unlocked at SUPER_REFERRER_THRESHOLD
export const SEAL_CREDITS_REFERRED_WELCOME = 3;
export const SUPER_REFERRER_THRESHOLD = 3;

/**
 * Grants the seal-credit referral reward, if this org was referred and
 * hasn't already been rewarded under this program. Call once, right after
 * an org's first-ever Verified Badge seal completes (the qualifying event —
 * see REFERRAL_SCOPE.md's "why this doubles as the anti-abuse gate"). Safe
 * to call speculatively — a no-op if there's no pending referral, or if this
 * referral already has a reward_type recorded.
 *
 * Best-effort by design: callers should wrap this in try/catch and never let
 * a failure here block the seal action itself.
 */
export async function grantSealCreditReferralReward(admin: SupabaseClient, referredOrgId: string): Promise<void> {
  const { data: referral } = await admin
    .from("referrals")
    .select("id, referrer_org_id")
    .eq("referred_org_id", referredOrgId)
    .is("reward_type", null)
    .maybeSingle();
  if (!referral) return; // not referred, or this program already paid out on this row

  // Option A (REFERRAL_SCOPE.md, "Decided 2026-08-03, edge case 4"):
  // reward-time plan check, no snapshot. A referrer who's since upgraded to
  // Pro+ gets nothing from this program — doc_credits is dead value on a
  // paid org (checkFreePlanDocCap only ever consults it for plan ===
  // "free") — but the payment-triggered reward is still fully live for them
  // if their referred friend later actually subscribes.
  let referrerCredits = 0;
  const { data: referrer } = await admin
    .from("organizations")
    .select("plan, doc_credits")
    .eq("id", referral.referrer_org_id)
    .single();
  if (referrer && referrer.plan === "free") {
    // Super Referrer: 3+ successful (actually-credited) seal-credit
    // referrals doubles the reward, going forward only (not retroactive).
    // Counted via credits_granted > 0 rather than status = 'rewarded' —
    // this program deliberately never sets status (see comment above), so
    // status = 'rewarded' only ever means "the old pro_month program paid
    // out on this row," not this one.
    const { count: priorRewards } = await admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_org_id", referral.referrer_org_id)
      .eq("reward_type", "seal_credits")
      .gt("credits_granted", 0);
    const credits =
      (priorRewards ?? 0) >= SUPER_REFERRER_THRESHOLD ? SEAL_CREDITS_SUPER_REFERRER : SEAL_CREDITS_STANDARD;

    // Compare-and-swap — same pattern checkFreePlanDocCap (plan.ts) uses to
    // spend doc_credits, here adding instead of subtracting.
    const { data: swapped } = await admin
      .from("organizations")
      .update({ doc_credits: referrer.doc_credits + credits })
      .eq("id", referral.referrer_org_id)
      .eq("doc_credits", referrer.doc_credits)
      .select("id")
      .maybeSingle();
    if (swapped) referrerCredits = credits;
  }

  // Reward the referred side too (REFERRAL_SCOPE.md, "Open decision"
  // resolved yes) — a smaller welcome credit on their own first seal, same
  // triggering event, independent of what the referrer gets. Same
  // no-dead-credits reasoning as Option A above, applied symmetrically: only
  // grant it if the referred org is itself still on the free plan (the only
  // plan that can ever spend doc_credits).
  let referredCredits = 0;
  const { data: referredOrg } = await admin.from("organizations").select("plan, doc_credits").eq("id", referredOrgId).single();
  if (referredOrg && referredOrg.plan === "free") {
    const { data: swapped } = await admin
      .from("organizations")
      .update({ doc_credits: referredOrg.doc_credits + SEAL_CREDITS_REFERRED_WELCOME })
      .eq("id", referredOrgId)
      .eq("doc_credits", referredOrg.doc_credits)
      .select("id")
      .maybeSingle();
    if (swapped) referredCredits = SEAL_CREDITS_REFERRED_WELCOME;
  }

  // Audit-trail row, mirroring credit_purchases' pattern from the
  // credit-pack feature — don't just mutate balances silently. Stamped
  // regardless of whether the referrer specifically got credited (e.g. they
  // were already Pro+), since this row's seal event has now resolved either
  // way and shouldn't be re-evaluated on a later call.
  await admin
    .from("referrals")
    .update({ reward_type: "seal_credits", credits_granted: referrerCredits, referred_credits_granted: referredCredits })
    .eq("id", referral.id);
}
