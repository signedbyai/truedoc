import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignupConversions } from "@/lib/conversion-api";

// Records first-touch signup attribution onto the org, from the params the
// browser stashed on the ad landing. Set-once: only writes if the org has no
// source yet, so the first campaign that brought them keeps the credit even if
// they revisit later from somewhere else.
const bodySchema = z.object({
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  referrer: z.string().max(300).optional(),
  landing_path: z.string().max(200).optional(),
  // Ad-platform click IDs (0051_signup_click_ids.sql) — captured cookielessly
  // alongside the UTM params above, for a future server-side Conversions API
  // send. Not sent to either platform yet; see that migration's comment.
  rdt_cid: z.string().max(200).optional(),
  li_fat_id: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !parsed.data.utm_source) return NextResponse.json({ ok: false }, { status: 200 });

  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("signup_utm_source").eq("id", orgId).single();
  if (!org || org.signup_utm_source) return NextResponse.json({ ok: true }); // already attributed

  const { error } = await admin
    .from("organizations")
    .update({
      signup_utm_source: parsed.data.utm_source,
      signup_utm_medium: parsed.data.utm_medium ?? null,
      signup_utm_campaign: parsed.data.utm_campaign ?? null,
      signup_utm_content: parsed.data.utm_content ?? null,
      signup_utm_term: parsed.data.utm_term ?? null,
      signup_referrer: parsed.data.referrer ?? null,
      signup_landing_path: parsed.data.landing_path ?? null,
      signup_rdt_cid: parsed.data.rdt_cid ?? null,
      signup_li_fat_id: parsed.data.li_fat_id ?? null,
    })
    .eq("id", orgId)
    .is("signup_utm_source", null);

  // Fire the server-side conversion send only on the write that actually won
  // the set-once race, and only ever from this one attribution choke point --
  // never call this from anywhere else, or Reddit/LinkedIn will get duplicate
  // events for the same org.
  if (!error && (parsed.data.rdt_cid || parsed.data.li_fat_id)) {
    void sendSignupConversions({ orgId, rdtCid: parsed.data.rdt_cid, liFatId: parsed.data.li_fat_id }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
