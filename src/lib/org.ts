import { createClient } from "@/lib/supabase/server";

export type UserOrg = { id: string; name: string; plan: string };

/**
 * Pure selection logic, split out from getUserAndOrg() so it's unit-
 * testable without a Supabase client (this codebase has no established
 * mocking pattern for Supabase-client-dependent code — see
 * ai-provider.ts/normalizeAIProvider() and plan.ts for the same
 * extract-the-pure-part precedent).
 *
 * `orgs` must already be ordered most-recently-joined first (getUserAndOrg
 * does this via the query's `order`). `preferredOrgId` is whatever the
 * caller has stored as this account's active-org preference (see
 * getUserAndOrg's doc comment on where that lives) — honored only if it's
 * still a real membership, so a stale preference (e.g. the user was
 * removed from that org since) can't strand them on a 404.
 */
export function resolveActiveOrgId(orgs: { id: string }[], preferredOrgId: string | null | undefined): string | null {
  if (orgs.length === 0) return null;
  if (preferredOrgId && orgs.some((o) => o.id === preferredOrgId)) return preferredOrgId;
  return orgs[0].id;
}

/**
 * Returns the current user and their "active" org, plus every org they
 * belong to (for the org switcher, src/components/org-switcher.tsx).
 *
 * A personal org is auto-created on signup (see
 * supabase/migrations/0002_new_user_org.sql). Accepting a team invite (see
 * src/app/api/team/invite/accept/route.ts) adds a second membership row
 * rather than replacing the first, so a user can belong to more than one
 * org at once. Which one is "active" is an account-wide preference stored
 * in Supabase Auth's user_metadata (`active_org_id`, written by
 * PUT /api/org/switch) — cross-device with no separate table/migration,
 * since it rides along on the same supabase.auth.getUser() call this
 * function already makes. Falls back to the most-recently-joined org if
 * there's no preference yet, or if the stored preference no longer points
 * at a real membership (see resolveActiveOrgId).
 *
 * Returns null if there's no authenticated session or no membership.
 */
export async function getUserAndOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("org_id, organizations(id, name, plan)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!memberships || memberships.length === 0) return null;

  const orgs: UserOrg[] = memberships
    .map((m) => {
      // Embedded to-one relationships sometimes come back as an array
      // depending on how Supabase infers the join — normalize either shape.
      const raw = m.organizations as unknown;
      const org = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; plan: string } | undefined;
      return org ?? null;
    })
    .filter((o): o is UserOrg => o !== null);

  if (orgs.length === 0) return null;

  const preferredOrgId = (user.user_metadata?.active_org_id as string | undefined) ?? null;
  const orgId = resolveActiveOrgId(orgs, preferredOrgId);
  if (!orgId) return null;

  return { supabase, user, orgId, orgs };
}
