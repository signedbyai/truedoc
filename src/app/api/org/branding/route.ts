import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  brand_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #1e3a5f")
    .optional()
    .nullable(),
});

// Renaming the workspace is available on every plan; brand_color (used to
// tint the signing page) is Business-tier "custom branding" — see plan.ts.
export async function PUT(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;

  if (parsed.data.brand_color !== undefined) {
    const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
    if (!org || !planHasFeature(org.plan, "customBranding")) {
      return NextResponse.json({ error: "Custom branding requires the Team plan.", upgrade: true }, { status: 402 });
    }
    updates.brand_color = parsed.data.brand_color;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabase.from("organizations").update(updates).eq("id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
