import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignupConversions } from "@/lib/conversion-api";

// Shared first-touch attribution payload + the single org-write choke point.
//
// Extracted from api/attribution/capture/route.ts on 2026-08-13 when a second
// claim path was added (pending-attribution.ts, for the magic-link browser
// hop). The conversion-API send below MUST stay in exactly one place -- see
// its comment -- so both paths call this function rather than each doing
// their own update, which is the whole reason this file exists.
export const attributionPayloadSchema = z.object({
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  referrer: z.string().max(300).optional(),
  landing_path: z.string().max(200).optional(),
  // Ad-platform click IDs (0051_signup_click_ids.sql) — captured cookielessly
  // alongside the UTM params above, for the server-side Conversions API send.
  rdt_cid: z.string().max(200).optional(),
  li_fat_id: z.string().max(200).optional(),
});

export type AttributionPayload = z.infer<typeof attributionPayloadSchema>;

// Set-once: only writes if the org has no source yet, so the first campaign
// that brought them keeps the credit even if they revisit later from
// somewhere else. Returns true only when THIS call won the race and actually
// wrote — callers use that to avoid double-counting.
export async function recordOrgAttribution(orgId: string, payload: AttributionPayload): Promise<boolean> {
  if (!payload.utm_source) return false;

  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("signup_utm_source").eq("id", orgId).single();
  if (!org || org.signup_utm_source) return false; // already attributed

  const { error } = await admin
    .from("organizations")
    .update({
      signup_utm_source: payload.utm_source,
      signup_utm_medium: payload.utm_medium ?? null,
      signup_utm_campaign: payload.utm_campaign ?? null,
      signup_utm_content: payload.utm_content ?? null,
      signup_utm_term: payload.utm_term ?? null,
      signup_referrer: payload.referrer ?? null,
      signup_landing_path: payload.landing_path ?? null,
      signup_rdt_cid: payload.rdt_cid ?? null,
      signup_li_fat_id: payload.li_fat_id ?? null,
    })
    .eq("id", orgId)
    .is("signup_utm_source", null);

  if (error) return false;

  // Fire the server-side conversion send only on the write that actually won
  // the set-once race, and only ever from this one attribution choke point --
  // never call sendSignupConversions from anywhere else, or Reddit/LinkedIn
  // will get duplicate events for the same org.
  if (payload.rdt_cid || payload.li_fat_id) {
    void sendSignupConversions({ orgId, rdtCid: payload.rdt_cid, liFatId: payload.li_fat_id }).catch(() => {});
  }

  return true;
}
