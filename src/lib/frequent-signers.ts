import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

export type FrequentSigner = {
  id: string;
  name: string;
  email: string;
  isSelf: boolean;
};

const MAX_NAME_CHARS = 120;
const MAX_EMAIL_CHARS = 254;

export { MAX_NAME_CHARS, MAX_EMAIL_CHARS };

// Same "first name from full_name/name metadata" fallback chain already used
// for the dashboard greeting (dashboard/page.tsx, dashboard/layout.tsx) and
// the feedback route -- but keeps the *full* name here (a signer's contact
// entry should show more than a first name) and falls back to the email's
// local part if the account has no display name at all, since `name` is a
// not-null column.
function selfDisplayName(user: User): string {
  const fullName = ((user.user_metadata?.full_name || user.user_metadata?.name || "") as string).trim();
  if (fullName) return fullName;
  return user.email?.split("@")[0] || "You";
}

/**
 * Returns an org's saved frequent signers, seeding the list with the
 * signed-in user's own name/email as the first entry if it's currently
 * empty -- the cold-start fix (see product_backlog.md): a brand-new list is
 * never empty, and it covers the real case of a sender who's a party to
 * their own documents. Only ever seeds once; a sender who deletes every
 * contact (including their own) gets an empty list back, not a reseed.
 */
export async function listFrequentSigners(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  user: User
): Promise<FrequentSigner[]> {
  const { data, error } = await supabase
    .from("frequent_signers")
    .select("id, name, email, is_self")
    .eq("org_id", orgId)
    .order("is_self", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (data && data.length > 0) {
    return data.map((r) => ({ id: r.id, name: r.name, email: r.email, isSelf: r.is_self }));
  }

  // Nothing yet for this org (brand new, or a pre-existing org that's never
  // touched this feature) -- seed the self entry now rather than at
  // migration time, so it also covers orgs created before this table
  // existed. Best-effort: if the insert races with another request (two
  // tabs both hitting an empty list) or fails outright, just return the
  // empty list rather than erroring the whole request.
  if (!user.email) return [];
  const { data: seeded } = await supabase
    .from("frequent_signers")
    .insert({ org_id: orgId, name: selfDisplayName(user), email: user.email, is_self: true })
    .select("id, name, email, is_self")
    .single();

  if (!seeded) return [];
  return [{ id: seeded.id, name: seeded.name, email: seeded.email, isSelf: seeded.is_self }];
}
