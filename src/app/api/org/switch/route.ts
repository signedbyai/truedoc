import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { bodySchema } from "./schema";

// Switches which org is "active" for this account — see getUserAndOrg()'s
// doc comment in src/lib/org.ts for the full picture. The preference is
// stored in Supabase Auth's user_metadata (active_org_id), not a cookie or
// a new table: cross-device with zero migration, since every
// getUserAndOrg() call already reads user_metadata off the same
// supabase.auth.getUser() call it makes anyway.
export async function PUT(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgs } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // getUserAndOrg() already fetched every org this user belongs to, so this
  // reuses that instead of a second membership query. Never skip this
  // check: user_metadata is otherwise user-writable, and this endpoint is
  // the only place that's supposed to set active_org_id — it must only
  // ever point at an org the caller is actually a member of, or a stale/
  // malicious value here would strand (or worse, mislead) them on their
  // next request.
  if (!orgs.some((o) => o.id === parsed.data.orgId)) {
    return NextResponse.json({ error: "You're not a member of that organization." }, { status: 403 });
  }

  const { error } = await supabase.auth.updateUser({ data: { active_org_id: parsed.data.orgId } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
