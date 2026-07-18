import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { bodySchema } from "./schema";

// Org-wide preference for whether AI field-placement suggestions
// (src/lib/suggest-fields.ts) run automatically on a brand-new document's
// upload, versus only when the sender explicitly presses "Suggest fields"
// — see 0014's migration comment and field-editor.tsx's auto-run effect.
// Any org member can toggle it, same precedent as renaming the workspace
// in the branding route.
export async function PUT(request: Request) {
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
    .update({ auto_suggest_on_upload: parsed.data.enabled })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
