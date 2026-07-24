import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { bodySchema } from "./schema";

// Org-wide preference for which AI provider powers field suggestions,
// document drafting, and summaries/translation (see src/lib/ai-provider.ts
// and migration 0015). Setting "mistral" is always allowed (the safe
// default, and how an org that downgraded from Business gets back to it
// even after Settings stops showing the picker). Setting "anthropic"
// requires the Business-plan aiAnthropicProvider feature — see plan.ts and
// /privacy + /dpa's Business-plan-qualified Anthropic disclosure. No role
// gating beyond that (any org member can toggle it), same precedent as
// auto-suggest and the branding settings routes.
export async function PUT(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (parsed.data.provider === "anthropic") {
    const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
    if (!org || !planHasFeature(org.plan, "aiAnthropicProvider")) {
      return NextResponse.json(
        { error: "Switching to Anthropic requires the Business plan.", upgrade: true },
        { status: 402 }
      );
    }
  }

  const { error } = await supabase
    .from("organizations")
    .update({ ai_provider: parsed.data.provider })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
