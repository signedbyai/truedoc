import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";

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

  await admin
    .from("organizations")
    .update({
      signup_utm_source: parsed.data.utm_source,
      signup_utm_medium: parsed.data.utm_medium ?? null,
      signup_utm_campaign: parsed.data.utm_campaign ?? null,
      signup_utm_content: parsed.data.utm_content ?? null,
      signup_utm_term: parsed.data.utm_term ?? null,
      signup_referrer: parsed.data.referrer ?? null,
      signup_landing_path: parsed.data.landing_path ?? null,
    })
    .eq("id", orgId)
    .is("signup_utm_source", null);

  return NextResponse.json({ ok: true });
}
