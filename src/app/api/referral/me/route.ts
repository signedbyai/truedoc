import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferralCode, referralLink } from "@/lib/referral";

// Returns the current org's referral code + link, plus how many referrals have
// converted (reward earned). Lazily assigns a code the first time it's asked
// for, retrying on the rare unique-collision.
export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("referral_code").eq("id", orgId).single();
  let code = org?.referral_code ?? null;

  if (!code) {
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = generateReferralCode();
      const { error } = await admin.from("organizations").update({ referral_code: candidate }).eq("id", orgId);
      if (!error) code = candidate;
    }
    if (!code) return NextResponse.json({ error: "Couldn't generate a code" }, { status: 500 });
  }

  // "Converted" = the referred org paid and the referrer was credited.
  const { count } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_org_id", orgId)
    .eq("status", "rewarded");

  return NextResponse.json({ code, link: referralLink(code), rewardedCount: count ?? 0 });
}
