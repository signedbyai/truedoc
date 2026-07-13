import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";

export const bodySchema = z.object({ provider: z.enum(["anthropic", "mistral"]) });

// Org-wide preference for which AI provider powers field suggestions,
// document drafting, and summaries/translation (see
// src/lib/ai-provider.ts and migration 0015). Not a plan-tier gate — any
// org member can toggle it, same precedent as auto-suggest and the
// branding settings routes.
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
    .update({ ai_provider: parsed.data.provider })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
