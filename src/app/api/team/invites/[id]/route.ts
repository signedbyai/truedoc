import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";

// Revokes a pending invite. RLS ("org admins can manage invites") already
// scopes this to owners/admins of the invite's own org.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { error, count } = await supabase
    .from("org_invites")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
