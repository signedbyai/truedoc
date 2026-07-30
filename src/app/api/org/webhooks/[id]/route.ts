import { NextResponse } from "next/server";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { getUserAndOrg } from "@/lib/org";

const bodySchema = z.object({ enabled: z.boolean() });

async function requireOwnerOrAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string
) {
  const { data: requester } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();
  return Boolean(requester && (requester.role === "owner" || requester.role === "admin"));
}

// Enable/disable a webhook endpoint — same shape as a full edit form would
// be overkill for phase 1 (url/label are set once at creation; the only
// thing worth toggling after the fact is on/off, per the scope doc's CRUD
// list: "add endpoint, view/copy each endpoint's secret, enable/disable,
// remove").
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  if (!(await requireOwnerOrAdmin(supabase, orgId, user.id))) {
    return NextResponse.json({ error: "Only org owners/admins can manage webhooks" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data: endpoint } = await supabase.from("webhook_endpoints").select("org_id").eq("id", id).single();
  if (!endpoint || endpoint.org_id !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("webhook_endpoints").update({ enabled: parsed.data.enabled }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  if (!(await requireOwnerOrAdmin(supabase, orgId, user.id))) {
    return NextResponse.json({ error: "Only org owners/admins can manage webhooks" }, { status: 403 });
  }

  const { data: endpoint } = await supabase.from("webhook_endpoints").select("org_id").eq("id", id).single();
  if (!endpoint || endpoint.org_id !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
