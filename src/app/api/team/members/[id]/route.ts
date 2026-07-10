import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";

// Removes a member from the current org. Only owners/admins can do this
// (enforced by the "org admins can remove members" RLS policy — the delete
// silently no-ops if the caller isn't an admin, so we double-check
// affected row count below). The owner's own row can never be removed.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: target } = await supabase
    .from("organization_members")
    .select("id, role, org_id")
    .eq("id", id)
    .single();

  if (!target || target.org_id !== orgId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "The org owner can't be removed" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("organization_members")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) {
    return NextResponse.json({ error: "Only org owners/admins can remove members" }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
