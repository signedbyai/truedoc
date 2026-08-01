import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { startOrgIdentityVerification } from "@/lib/identity";

// POST /api/org/identity/start — begins (or redoes) the org's one-time
// Stripe Identity check for Verified Badge (VERIFIED_BADGE_SCOPE.md).
// Session-authenticated, any org member can trigger it — same permission
// level as /api/org/console-settings, not owner/admin-restricted, since
// this doesn't rotate a credential the way API key generation does. Called
// from two places: the console chat flow when a seal is attempted with no
// verification on file yet, and the manual "redo it" link in Settings.
export async function POST() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { clientSecret } = await startOrgIdentityVerification(ctx.orgId);
    return NextResponse.json({ clientSecret });
  } catch (err) {
    console.error("Failed to start org identity verification", err);
    return NextResponse.json({ error: "Couldn't start identity verification. Try again shortly." }, { status: 500 });
  }
}
