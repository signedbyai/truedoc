import { createClient } from "@/lib/supabase/server";

/**
 * Returns the current user and their "active" org.
 *
 * A personal org is auto-created on signup (see
 * supabase/migrations/0002_new_user_org.sql). Accepting a team invite (see
 * src/app/api/team/invite/accept/route.ts) adds a second membership row
 * rather than replacing the first — this app doesn't have a full org
 * switcher yet, so the *most recently joined* org is treated as active.
 * That means joining a team makes the team workspace the one you see in the
 * dashboard; there's currently no way to switch back without another
 * invite/membership change. Revisit with a real org switcher if/when users
 * need to belong to multiple active orgs at once.
 *
 * Returns null if there's no authenticated session or no membership.
 */
export async function getUserAndOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  return { supabase, user, orgId: membership.org_id as string };
}
