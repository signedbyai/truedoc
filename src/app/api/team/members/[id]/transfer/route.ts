import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";

// Transfers the caller's own admin-tier seat (owner OR admin) to another
// member, who must not already hold an admin-tier role. See
// supabase/migrations/0033_admin_role_management.sql — for an owner
// transfer, transfer_admin_seat() also updates organizations.owner_id so it
// stays in sync with the role row, all inside one transaction (never a
// window with zero or two owners). The role check below is just for a
// fast, specific 403 before hitting the DB — same shape as promote/route.ts.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "teamMembers")) {
    return NextResponse.json(
      { error: "Transferring admin access requires the Team plan or higher.", upgrade: true },
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
    return NextResponse.json({ error: "Only the current owner or admin can transfer their role" }, { status: 403 });
  }

  const { error } = await supabase.rpc("transfer_admin_seat", { p_target_member_id: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
