import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { generateApiKey } from "@/lib/api-key";

// Generates (or regenerates) the org's API key. The raw key is returned
// exactly once in this response and never stored — only its hash is kept,
// see src/lib/api-key.ts.
export async function POST() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  // Business gets unlimited included access (apiAccess); Pro/Team get the
  // metered console path (consoleAccess) — see api-auth.ts's ApiAuthResult
  // for how the two combine at request time. Previously this route only
  // honored apiAccess, so a Pro/Team org had no way to ever get a key at
  // all despite the metering backend already accepting their calls — see
  // CONSOLE_UX_SCOPE.md's "the actual gap" section.
  if (!org || (!planHasFeature(org.plan, "apiAccess") && !planHasFeature(org.plan, "consoleAccess"))) {
    return NextResponse.json(
      { error: "API access requires the Pro plan (metered) or the Business plan (unlimited).", upgrade: true },
      { status: 402 }
    );
  }

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
