import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { bodySchema } from "./schema";

// Org-wide "ask me every time" vs "always use last position" toggle
// (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.1) — mirrors
// /api/org/auto-suggest's exact shape (a plain org-level enum, any org
// member can change it). Deliberately its own route, not folded into
// /api/org/console-settings: Console/MCP sealing have no UI to place a
// badge in at all, so this setting is structurally meaningless outside the
// dashboard — see the scope doc's "Where this lives" section for the full
// reasoning (this doc's Console-settings-card home was tried first and was
// wrong).
export async function PATCH(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabase
    .from("organizations")
    .update({ badge_placement_mode: parsed.data.mode })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
