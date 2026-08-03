import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateReferralCode,
  referralLink,
  SEAL_CREDITS_STANDARD,
  SEAL_CREDITS_SUPER_REFERRER,
  SUPER_REFERRER_THRESHOLD,
} from "@/lib/referral";

// Returns the current org's referral code + link, plus how many referrals have
// converted (reward earned). Lazily assigns a code the first time it's asked
// for, retrying on the rare unique-collision.
//
// Also returns which reward program applies (REFERRAL_SCOPE.md, 2026-08-03):
// Free orgs get the seal-credits program headline, Pro+ keep the unchanged
// "give a month, get a month" one — `referral-card.tsx`/`referral-gift-
// button.tsx` branch their copy on `plan`/`rewardType` from this response.
export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("referral_code, plan").eq("id", orgId).single();
  let code = org?.referral_code ?? null;
  const plan = org?.plan ?? "free";

  if (!code) {
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = generateReferralCode();
      const { error } = await admin.from("organizations").update({ referral_code: candidate }).eq("id", orgId);
      if (!error) code = candidate;
    }
    if (!code) return NextResponse.json({ error: "Couldn't generate a code" }, { status: 500 });
  }

  // "Converted" = the referred org paid and the referrer was credited (the
  // original pro_month program's own counter — unchanged, still what Pro+'s
  // card copy reads).
  const { count: rewardedCount } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_org_id", orgId)
    .eq("status", "rewarded");

  // Seal-credits program's own counter. Deliberately NOT filtered by status
  // — that column stays owned by the pro_month path (see referral.ts's
  // grantSealCreditReferralReward); credits_granted > 0 is this program's
  // own "did it actually pay out" signal.
  const { count: sealCreditsRewardedCount } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_org_id", orgId)
    .eq("reward_type", "seal_credits")
    .gt("credits_granted", 0);

  const isSuperReferrer = (sealCreditsRewardedCount ?? 0) >= SUPER_REFERRER_THRESHOLD;

  return NextResponse.json({
    code,
    link: referralLink(code),
    rewardedCount: rewardedCount ?? 0,
    plan,
    rewardType: plan === "free" ? "seal_credits" : "pro_month",
    creditsPerReferral: isSuperReferrer ? SEAL_CREDITS_SUPER_REFERRER : SEAL_CREDITS_STANDARD,
    isSuperReferrer,
    sealCreditsRewardedCount: sealCreditsRewardedCount ?? 0,
  });
}
