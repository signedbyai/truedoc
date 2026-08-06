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
// Reddit schema confirmed against Reddit's documented sample payload
// (event-level click_id, event_at ISO8601, event_type.tracking_type,
// event_metadata.conversion_id). LinkedIn schema confirmed against
// Microsoft Learn's Conversions API docs (userIds[].idType =
// LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID for li_fat_id matching).

async function sendRedditConversion(clickId: string, orgId: string) {
  const token = process.env.REDDIT_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.REDDIT_PIXEL_ID;
  if (!token || !pixelId) return;

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
      console.error("Reddit CAPI send failed", { orgId, status: res.status, body: await res.text() });
    }
  } catch (err) {
    console.error("Reddit CAPI send error", { orgId, err });
  }
}

async function sendLinkedinConversion(clickId: string, orgId: string) {
  const token = process.env.LINKEDIN_CAPI_ACCESS_TOKEN;
  const conversionUrn = process.env.LINKEDIN_CONVERSION_URN;
  if (!token || !conversionUrn) return;

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
      console.error("LinkedIn CAPI send failed", { orgId, status: res.status, body: await res.text() });
    }
  } catch (err) {
    console.error("LinkedIn CAPI send error", { orgId, err });
  }
}

export async function sendSignupConversions(opts: { orgId: string; rdtCid?: string | null; liFatId?: string | null }) {
  const sends: Promise<void>[] = [];
  if (opts.rdtCid) sends.push(sendRedditConversion(opts.rdtCid, opts.orgId));
  if (opts.liFatId) sends.push(sendLinkedinConversion(opts.liFatId, opts.orgId));
  if (sends.length === 0) return;
  await Promise.allSettled(sends);
}
