import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndOrg } from "@/lib/org";
import { bodySchema } from "./schema";

// Saves the Badge Placer's chosen position (IN_DOCUMENT_BADGE_AND_API_SEAL_
// SCOPE.md V1.1/V1.4) — called from the Seal tab right after "Position
// saved," before the actual seal call. Overwrites BOTH this document's own
// badge_page/x/y/width AND the org's last_badge_* columns in the same
// write, per V1.4's "overwrites both this document's stored position and
// the org's last_badge_* columns" — one remembered value org-wide, no
// naming, no dropdown. Same session-authenticated, RLS-backed pattern as
// the sibling payment/route.ts (no plan gate here — placement itself is
// free on every plan; only the payment-link half of this same screen is
// Business-gated).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid badge placement." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("id, org_id").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { badge_page, badge_x, badge_y, badge_width } = parsed.data;

  const { error: docError } = await supabase
    .from("documents")
    .update({ badge_page, badge_x, badge_y, badge_width })
    .eq("id", id);
  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  // Only overwrite the org's remembered position on an actual save (not a
  // clear) — clearing this one document's placement shouldn't erase what
  // every future new document opens the placer at.
  if (badge_page != null && badge_x != null && badge_y != null && badge_width != null) {
    const { error: orgError } = await supabase
      .from("organizations")
      .update({
        last_badge_page: badge_page,
        last_badge_x: badge_x,
        last_badge_y: badge_y,
        last_badge_width: badge_width,
      })
      .eq("id", orgId);
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
