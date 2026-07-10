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
  if (!org || !planHasFeature(org.plan, "apiAccess")) {
    return NextResponse.json({ error: "API access requires the Business plan.", upgrade: true }, { status: 402 });
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
