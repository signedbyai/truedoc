import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ code: z.string().trim().min(4).max(16) });

// Record that the current org was referred, from a code stashed in the
// browser when they landed on /?ref=CODE. Idempotent and abuse-guarded:
// - only binds if this org has no referrer yet (first referral wins, can't
//   be overwritten later),
// - a code can't refer its own org,
// - writes go through the admin client (referrals is RLS insert-locked).
// The reward itself only unlocks later, on the referred org's first real
// payment (see the Stripe webhook) — recording here just links the two orgs.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 200 });

  const admin = createAdminClient();

  // Already referred (or already processed)? Nothing to do.
  const { data: me } = await admin
    .from("organizations")
    .select("id, referred_by_org_id")
    .eq("id", orgId)
    .single();
  if (!me || me.referred_by_org_id) return NextResponse.json({ ok: true });

  // Resolve the code to a referrer org (case-insensitive), and never let an
  // org refer itself.
  const { data: referrer } = await admin
    .from("organizations")
    .select("id")
    .ilike("referral_code", parsed.data.code)
    .single();
  if (!referrer || referrer.id === orgId) return NextResponse.json({ ok: true });

  await admin.from("organizations").update({ referred_by_org_id: referrer.id }).eq("id", orgId);
  // upsert on the unique referred_org_id so a double-fire can't duplicate.
  await admin
    .from("referrals")
    .upsert(
      { referrer_org_id: referrer.id, referred_org_id: orgId, status: "pending" },
      { onConflict: "referred_org_id" }
    );

  return NextResponse.json({ ok: true });
}
