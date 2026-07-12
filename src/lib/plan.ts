import { NextResponse } from "next/server";
import type { createClient } from "@/lib/supabase/server";

// Feature gating for paid-tier functionality. Kept as a single source of
// truth so the app logic always matches what pricing-cards.tsx promises —
// see that file for the customer-facing copy these gates enforce.
export type PlanId = "free" | "starter" | "team" | "business";

const FEATURE_PLANS = {
  // Starter: "Templates & reminders" — saving/using templates and both
  // manual + automatic signer reminders.
  templates: ["starter", "team", "business"],
  reminders: ["starter", "team", "business"],
  // Team: "Shared templates" — multiple org members, so templates/documents
  // become genuinely shared instead of single-user.
  teamMembers: ["team", "business"],
  // Team: "Bulk send"
  bulkSend: ["team", "business"],
  // Team: "Basic branding" — org name replaces the default SignedBy footer
  // on the signing page. Business: "Custom branding" — org logo + color too.
  branding: ["team", "business"],
  customBranding: ["business"],
  // Business: "API access"
  apiAccess: ["business"],
  // Business: "Payment collection" — an external link (e.g. a Stripe Payment
  // Link the org already owns), not a Connect-style in-app charge. See
  // src/app/api/documents/[id]/payment/route.ts for why.
  paymentCollection: ["business"],
} as const;

export type Feature = keyof typeof FEATURE_PLANS;

export function planHasFeature(plan: string | null | undefined, feature: Feature): boolean {
  return (FEATURE_PLANS[feature] as readonly string[]).includes(plan || "free");
}

export const FEATURE_UPGRADE_PLAN: Record<Feature, PlanId> = {
  templates: "starter",
  reminders: "starter",
  teamMembers: "team",
  bulkSend: "team",
  branding: "team",
  customBranding: "business",
  apiAccess: "business",
  paymentCollection: "business",
};

// Team member seat caps — matches the "Up to N users" pricing-cards.tsx
// copy. Only plans that unlock teamMembers at all need an entry; plans
// below that (free/starter) are blocked earlier by planHasFeature and
// never reach a seat-limit check.
const TEAM_MEMBER_LIMIT: Partial<Record<PlanId, number>> = {
  team: 3,
  business: 5,
};

/** Returns the seat cap for a plan, or null if the plan has no cap. */
export function teamMemberLimit(plan: string | null | undefined): number | null {
  return TEAM_MEMBER_LIMIT[(plan || "free") as PlanId] ?? null;
}

// Free plan: 3 new documents/month, regardless of how the document was
// created (uploaded, duplicated, or AI-drafted) — every one of those ends
// with a new `documents` row, so all three routes need this same guard or
// a Free org could bypass the cap by duplicating/drafting past it. Kept
// here (not re-inlined per route) after it was found byte-for-byte
// duplicated in the upload and duplicate routes.
export async function checkFreePlanDocCap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
): Promise<NextResponse | null> {
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (org && org.plan !== "free") return null;

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", startOfMonth.toISOString());

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "You've hit the Free plan's 3 documents/month limit. Upgrade to keep going.", upgrade: true },
      { status: 402 }
    );
  }
  return null;
}
