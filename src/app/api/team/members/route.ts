import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists the current org's roster (members + pending invites). Member emails
// live in auth.users, which isn't queryable through the regular RLS-bound
// client, so this uses the service-role admin client for lookups only —
// the caller's own membership is still verified via getUserAndOrg() first.
//
// `name` and `isSelf` (added 2026-07-23 for sender-identity-picker.tsx, the
// "Prepared by" team-member picker on the AI Drafter/Magic Quote review
// steps) are additive — this route had no other caller before that (the
// Team settings page queries organization_members directly server-side
// rather than fetching this route; only DELETE .../[id] was used
// client-side), so widening the response shape here is safe.
export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId, user } = ctx;

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
      const email = data?.user?.email || "unknown";
      // Same full_name/name-metadata fallback chain used for the dashboard
      // greeting and frequent-signers.ts's self-seed — falls back to the
      // email's local part so there's always something displayable.
      const metaName = ((data?.user?.user_metadata?.full_name || data?.user?.user_metadata?.name || "") as string).trim();
      const name = metaName || email.split("@")[0] || "Unknown";
      return { ...m, email, name, isSelf: m.user_id === user.id };
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
