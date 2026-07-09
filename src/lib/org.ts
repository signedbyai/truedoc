import { createClient } from "@/lib/supabase/server";

/**
 * Returns the current user and the org they belong to (MVP: one org per
 * user, auto-created on signup — see supabase/migrations/0002_new_user_org.sql).
 * Returns null if there's no authenticated session.
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
    .limit(1)
    .single();

  if (!membership) return null;

  return { supabase, user, orgId: membership.org_id as string };
}
