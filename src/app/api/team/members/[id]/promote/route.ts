import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";

// Promotes an existing member into the org's admin-tier (owner + 1 admin,
// cap of 2 total). See supabase/migrations/0033_admin_role_management.sql —
// the actual write, and every rejection reason (not found, already
// admin-tier, cap reached), happens inside promote_member_to_admin() so it's
// enforced atomically regardless of what this route checks. The role check
// below is just for a fast, specific 403 before hitting the DB — same
// belt-and-suspenders shape as team/invite/route.ts.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "teamMembers")) {
    return NextResponse.json(
      { error: "Managing admins requires the Team plan or higher.", upgrade: true },
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
    return NextResponse.json({ error: "Only org owners/admins can promote members" }, { status: 403 });
  }

  const { error } = await supabase.rpc("promote_member_to_admin", { p_target_member_id: id });
  if (error) {
    // promote_member_to_admin raises a plain-text exception per rejection
    // case (cap reached, already admin-tier, etc.) — that message is written
    // to be shown directly to the user, so surface it as-is.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
