import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";
import { bodySchema } from "./schema";

// Standalone version of the same MX check embedded in the document send
// route and the frequent-signers add route (BOUNCE_TRACKING_SCOPE.md) —
// lets a form check-as-you-go (e.g. on blur) instead of only finding out
// once the sender presses a submit/add button. Never creates or changes
// anything, so it's safe to call speculatively.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  // A DNS lookup per call is cheap, but this is still an on-blur trigger a
  // client could fire rapidly — same defensive cap as other lightweight
  // endpoints, not because a real sender would ever hit it.
  const ok = await checkRateLimit(`check-email-domain:${orgId}`, 60, 60);
  if (!ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true }); // not this endpoint's job to validate shape

  const result = await checkEmailDomainHasMx(parsed.data.email);
  return NextResponse.json(result);
}
