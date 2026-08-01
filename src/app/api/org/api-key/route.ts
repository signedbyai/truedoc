import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { generateApiKey } from "@/lib/api-key";

// Generates (or regenerates) the org's API key. The raw key is returned
// exactly once in this response and never stored — only its hash is kept,
// see src/lib/api-key.ts.
export async function POST() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  // No plan gate here anymore (API_TIER_SCOPE.md, 2026-08-02) — every plan
  // now has a real path through authenticateApiRequest() at request time:
  // Business is unlimited, Pro/Team is metered (apiAccess/consoleAccess),
  // and Free is capped at 3 documents/month via checkFreePlanDocCap, same
  // as the dashboard UI. Key generation itself was never the right place to
  // gate access — the actual request-time check in api-auth.ts already
  // covers every plan, so this route just needs the org to exist.
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { data: requester } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();
  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    return NextResponse.json({ error: "Only org owners/admins can manage API keys" }, { status: 403 });
  }

  const { raw, hash, prefix } = generateApiKey();
  const { error } = await supabase
    .from("organizations")
    .update({ api_key_hash: hash, api_key_prefix: prefix })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ apiKey: raw, prefix });
}

export async function DELETE() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { error } = await supabase
    .from("organizations")
    .update({ api_key_hash: null, api_key_prefix: null })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
