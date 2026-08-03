import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReferralSummary } from "@/lib/referral";

// Returns the current org's referral summary — code, link, which reward
// program applies (REFERRAL_SCOPE.md, 2026-08-03: Free gets the
// seal-credits program, Pro+ keeps "give a month, get a month" unchanged),
// reward amounts, and both programs' counters. All the actual logic lives
// in referral.ts's getReferralSummary, shared with the console chat's
// get_referral_link tool (console-actions.ts) so every surface — this
// route (dashboard nav + console UI), and the chat when asked about
// referrals — agrees on the same numbers.
export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const summary = await getReferralSummary(createAdminClient(), ctx.orgId);
  if (!summary) return NextResponse.json({ error: "Couldn't generate a code" }, { status: 500 });

  return NextResponse.json(summary);
}
