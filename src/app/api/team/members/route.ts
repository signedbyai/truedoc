import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists the current org's roster (members + pending invites). Member emails
// live in auth.users, which isn't queryable through the regular RLS-bound
// client, so this uses the service-role admin client for lookups only —
// the caller's own membership is still verified via getUserAndOrg() first.
export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

  const admin = createAdminClient();
  const withEmail = await Promise.all(
    (members || []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      return { ...m, email: data?.user?.email || "unknown" };
    })
  );

  const { data: invites, error: invitesError } = await supabase
    .from("org_invites")
    .select("id, email, role, created_at, expires_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (invitesError) return NextResponse.json({ error: invitesError.message }, { status: 500 });

  return NextResponse.json({ members: withEmail, invites: invites || [] });
}
