import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { generateWebhookSecret } from "@/lib/webhooks";

const bodySchema = z.object({
  url: z.string().trim().url(),
  label: z.string().trim().max(100).optional().nullable(),
});

// Same trust level as issuing an API key (an endpoint here receives every
// document.completed payload, including a link to the signed PDF), so
// mutations are restricted to owners/admins the same way org/api-key/route.ts
// is. GET is listing only (secrets included, per the "always visible" design
// decision — see CRM_MCP_READINESS_PHASE1_SCOPE.md) — still member-only via
// getUserAndOrg, not further role-gated, matching how the rest of Settings
// works for any signed-in org member.
export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data, error } = await supabase
    .from("webhook_endpoints")
    .select("id, label, url, secret, enabled, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endpoints: data || [] });
}

export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  // Widened from apiAccess-only to apiAccess||consoleAccess (API_TIER_SCOPE.md,
  // direct instruction) — webhooks used to require Business specifically,
  // even though Pro/Team already had metered document-send access with no
  // way to get notified about it. Same combined check authenticateApiRequest
  // and dashboard/settings/page.tsx already use.
  if (!org || (!planHasFeature(org.plan, "apiAccess") && !planHasFeature(org.plan, "consoleAccess"))) {
    return NextResponse.json(
      { error: "Webhooks require the Pro plan or higher.", upgrade: true },
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
    return NextResponse.json({ error: "Only org owners/admins can manage webhooks" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid webhook endpoint." }, { status: 400 });
  }

  // Cap well above any realistic number of real destinations for one org —
  // keeps dispatch fan-out (one HTTP call per endpoint per event) bounded.
  const { count } = await supabase
    .from("webhook_endpoints")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: "You've reached the limit of 20 webhook endpoints." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      org_id: orgId,
      url: parsed.data.url,
      label: parsed.data.label || null,
      secret: generateWebhookSecret(),
    })
    .select("id, label, url, secret, enabled, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endpoint: data });
}
