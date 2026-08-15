import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { attributionPayloadSchema, recordOrgAttribution } from "@/lib/attribution";

// Records first-touch signup attribution onto the org, from the params the
// browser stashed on the ad landing (attribution-claim.tsx).
//
// This is the SAME-BROWSER path: it only fires when the person still has the
// localStorage the ad landing wrote, i.e. they landed and signed up without
// changing browsers. The cross-browser case (magic link opened in a different
// browser than the ad landed in — the common mobile path) is handled entirely
// server-side instead, see lib/pending-attribution.ts. Both funnel into
// recordOrgAttribution so the set-once write and the conversion-API send stay
// in one place.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = attributionPayloadSchema.safeParse(json);
  if (!parsed.success || !parsed.data.utm_source) return NextResponse.json({ ok: false }, { status: 200 });

  await recordOrgAttribution(orgId, parsed.data);

  return NextResponse.json({ ok: true });
}
