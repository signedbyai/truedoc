import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";

// PATCH /api/org/console-settings — the spend-cap on/off toggle and dollar
// amount, plus marking the one-time cap-explainer popover seen
// (CONSOLE_UX_SCOPE.md). Session-authenticated, any org member can adjust
// (same permission level as auto-suggest/branding settings — not
// restricted to owner/admin the way API key generation is, since this
// doesn't expose or rotate a credential).
const bodySchema = z.object({
  capEnabled: z.boolean().optional(),
  capCents: z.number().int().min(100).max(1000000).optional(),
  introSeen: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.capEnabled !== undefined) update.console_spend_cap_enabled = parsed.data.capEnabled;
  if (parsed.data.capCents !== undefined) update.console_spend_cap_cents = parsed.data.capCents;
  if (parsed.data.introSeen) update.console_cap_intro_seen_at = new Date().toISOString();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabase.from("organizations").update(update).eq("id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
