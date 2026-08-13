import { createAdminClient } from "@/lib/supabase/admin";

// Cookieless server-side conversion tracking: sends the click IDs captured by
// attribution-capture.tsx (rdt_cid / li_fat_id, see migration 0051) back to
// Reddit's and LinkedIn's Conversions API once a signup is attributed to one
// of their ads. This is what makes the click-ID capture actually useful --
// on its own it was just sitting in the organizations row unused.
//
// Deliberately NOT using either platform's browser pixel/Insight Tag, which
// would drop a new tracking cookie -- see [[feedback-avoid-cookies-legal-cost]].
// Server-to-server CAPI + a click ID passed as a URL param is the cookieless
// alternative both platforms document for exactly this case.
//
// Both sends are best-effort and fire-and-forget: a failure here must never
// block or break a signup. Errors are logged, not thrown.
//
// Required env vars (set directly in Vercel -- never put real values in this
// file or commit them):
//   REDDIT_CAPI_ACCESS_TOKEN     Events Manager > Conversions API > Generate Access Token
//   REDDIT_PIXEL_ID              Events Manager > Pixel configuration (the numeric/opaque pixel ID --
//                                 NOT the ad account ID; CAPI posts to a pixel, whether or not the
//                                 browser pixel snippet is actually installed on the site)
//   LINKEDIN_CAPI_ACCESS_TOKEN   3-legged OAuth token with rw_conversions + r_ads scopes
//   LINKEDIN_CONVERSION_URN      urn:lla:llaPartnerConversion:<id> -- from Campaign Manager >
//                                 Analyze > Conversion tracking (the specific rule to stream into)
//
// Every send attempt is recorded to conversion_sends (0056) and surfaced in
// the daily admin digest — see logSend below for why 'ok' and 'skipped' are
// logged and not just failures.
//
// Reddit schema confirmed against Reddit's documented sample payload
// (event-level click_id, event_at ISO8601, event_type.tracking_type,
// event_metadata.conversion_id). LinkedIn schema confirmed against
// Microsoft Learn's Conversions API docs (userIds[].idType =
// LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID for li_fat_id matching).

// Records the outcome of every send attempt (2026-08-13, see
// 0056_conversion_sends.sql). Best-effort on top of a best-effort path: if
// the logging itself fails we swallow it, because nothing here is allowed to
// affect the signup that triggered it.
//
// Logs 'skipped' and 'ok' as well as failures on purpose. "0 rows at all"
// (no click IDs arriving), "all skipped" (env vars unset), and "all failed"
// (expired token / schema drift) are three completely different problems
// that look identical from the outside if you only record errors.
async function logSend(row: {
  platform: "reddit" | "linkedin";
  outcome: "ok" | "failed" | "error" | "skipped";
  orgId: string;
  statusCode?: number;
  error?: string;
}) {
  try {
    await createAdminClient()
      .from("conversion_sends")
      .insert({
        platform: row.platform,
        outcome: row.outcome,
        org_id: row.orgId,
        status_code: row.statusCode ?? null,
        // Truncated — platform error bodies can be long, and the digest only
        // ever shows the most recent one as a hint for where to start.
        error: row.error ? row.error.slice(0, 500) : null,
      });
  } catch (err) {
    console.error("conversion_sends log failed", err);
  }
}

async function sendRedditConversion(clickId: string, orgId: string) {
  const token = process.env.REDDIT_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.REDDIT_PIXEL_ID;
  if (!token || !pixelId) {
    await logSend({ platform: "reddit", outcome: "skipped", orgId, error: "REDDIT_CAPI_ACCESS_TOKEN or REDDIT_PIXEL_ID not set" });
    return;
  }

  try {
    const res = await fetch(`https://ads-api.reddit.com/api/v2.0/conversions/events/${pixelId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events: [
          {
            click_id: clickId,
            event_at: new Date().toISOString(),
            event_type: { tracking_type: "SignUp" },
            event_metadata: { conversion_id: orgId },
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Reddit CAPI send failed", { orgId, status: res.status, body });
      await logSend({ platform: "reddit", outcome: "failed", orgId, statusCode: res.status, error: body });
    } else {
      await logSend({ platform: "reddit", outcome: "ok", orgId, statusCode: res.status });
    }
  } catch (err) {
    console.error("Reddit CAPI send error", { orgId, err });
    await logSend({ platform: "reddit", outcome: "error", orgId, error: err instanceof Error ? err.message : String(err) });
  }
}

async function sendLinkedinConversion(clickId: string, orgId: string) {
  const token = process.env.LINKEDIN_CAPI_ACCESS_TOKEN;
  const conversionUrn = process.env.LINKEDIN_CONVERSION_URN;
  if (!token || !conversionUrn) {
    await logSend({
      platform: "linkedin",
      outcome: "skipped",
      orgId,
      error: "LINKEDIN_CAPI_ACCESS_TOKEN or LINKEDIN_CONVERSION_URN not set",
    });
    return;
  }

  try {
    const res = await fetch("https://api.linkedin.com/rest/conversionEvents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202601",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        conversion: conversionUrn,
        conversionHappenedAt: Date.now(),
        eventId: `org-${orgId}`, // dedup key -- signup capture is set-once per org, so this is stable
        user: {
          userIds: [{ idType: "LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID", idValue: clickId }],
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      // A 401 here is overwhelmingly likely to be the ~60-day 3-legged OAuth
      // token having expired rather than anything wrong with the payload —
      // that's the specific silent failure this logging exists to surface.
      console.error("LinkedIn CAPI send failed", { orgId, status: res.status, body });
      await logSend({ platform: "linkedin", outcome: "failed", orgId, statusCode: res.status, error: body });
    } else {
      await logSend({ platform: "linkedin", outcome: "ok", orgId, statusCode: res.status });
    }
  } catch (err) {
    console.error("LinkedIn CAPI send error", { orgId, err });
    await logSend({ platform: "linkedin", outcome: "error", orgId, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function sendSignupConversions(opts: { orgId: string; rdtCid?: string | null; liFatId?: string | null }) {
  const sends: Promise<void>[] = [];
  if (opts.rdtCid) sends.push(sendRedditConversion(opts.rdtCid, opts.orgId));
  if (opts.liFatId) sends.push(sendLinkedinConversion(opts.liFatId, opts.orgId));
  if (sends.length === 0) return;
  await Promise.allSettled(sends);
}
