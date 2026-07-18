import { NextResponse } from "next/server";
import type { createClient } from "@/lib/supabase/server";

// Feature gating for paid-tier functionality. Kept as a single source of
// truth so the app logic always matches what pricing-cards.tsx promises —
// see that file for the customer-facing copy these gates enforce.
export type PlanId = "free" | "starter" | "team" | "business";

// Shared display label for a plan id — was duplicated locally in
// dashboard/billing/page.tsx; pulled here once dashboard/team/page.tsx and
// dashboard/page.tsx also needed it (same "extract once a third caller shows
// up" pattern as checkFreePlanDocCap below).
export const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  team: "Team",
  business: "Business",
};

const FEATURE_PLANS = {
  // Starter: "Templates & reminders" — saving/using templates and both
  // manual + automatic signer reminders.
  templates: ["starter", "team", "business"],
  reminders: ["starter", "team", "business"],
  // Starter: "AI-drafted documents" — the plain-language-ask drafting
  // feature. Gated here (unlike document-summary/field-suggestion, which
  // stay free) because it's the one feature calling the pricier Sonnet
  // model instead of Haiku, and it's a convenience/productivity feature
  // layered on top of core send-and-sign, not core functionality itself —
  // same shape as templates/reminders. Enforced at the draft-generation
  // call (src/app/api/documents/draft/route.ts), not just finalize, since
  // that's where the actual Anthropic cost is incurred.
  aiDraft: ["starter", "team", "business"],
  // Starter: per-page view-time/engagement tracking on a document a signer
  // is reviewing (see supabase/migrations/0017_document_page_views.sql and
  // src/app/api/sign/[token]/view/route.ts). Same tier as templates/
  // aiDraft — a productivity/insight layer on top of core send-and-sign,
  // not core functionality itself.
  pageViewTracking: ["starter", "team", "business"],
  // Team: "Shared templates" — multiple org members, so templates/documents
  // become genuinely shared instead of single-user.
  teamMembers: ["team", "business"],
  // Team: "Bulk send"
  bulkSend: ["team", "business"],
  // Team: full white-label on the signing page — org name, logo, and brand
  // colour. Collapsed into ONE promise on 2026-07-17 (customBranding moved
  // business → team): the old split of name-only at Team vs logo+colour at
  // Business was a confusing half-measure that undersold Team and made
  // Business read as "the tier where branding finally works". Both keys are
  // kept — `branding` gates removing SignedBy's mark, `customBranding` gates
  // the logo/colour controls — so callers don't all have to change.
  branding: ["team", "business"],
  customBranding: ["team", "business"],
  // Business: "API access"
  apiAccess: ["business"],
  // Business: "Payment collection" — an external link (e.g. a Stripe Payment
  // Link the org already owns), not a Connect-style in-app charge. See
  // src/app/api/documents/[id]/payment/route.ts for why.
  paymentCollection: ["business"],
  // Business: "DocGate" — gates an externally-owned link (e.g. Google Drive)
  // behind whole-document completion, with a per-signer engagement timeline.
  // Same external-link shape as paymentCollection, same tier: a
  // distribution/analytics capability on top of core send-and-sign, not core
  // functionality itself. See src/app/g/[code]/route.ts.
  docGate: ["business"],
} as const;

export type Feature = keyof typeof FEATURE_PLANS;

export function planHasFeature(plan: string | null | undefined, feature: Feature): boolean {
  return (FEATURE_PLANS[feature] as readonly string[]).includes(plan || "free");
}

export const FEATURE_UPGRADE_PLAN: Record<Feature, PlanId> = {
  templates: "starter",
  reminders: "starter",
  aiDraft: "starter",
  pageViewTracking: "starter",
  teamMembers: "team",
  bulkSend: "team",
  branding: "team",
  customBranding: "team",
  apiAccess: "business",
  paymentCollection: "business",
  docGate: "business",
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

// How many members over a plan's seat cap an org currently is (0 if within
// it, or if the plan has no cap at all). This is deliberately just a
// visibility signal, not enforcement — the app already never auto-removes
// members on downgrade (see team/invite/route.ts and
// team/invite/accept/route.ts, which only block *new* invites/accepts once
// at/over the cap; existing members keep working regardless of plan). What
// was missing was surfacing this clearly to an org admin who downgraded via
// Stripe's own portal (outside this app entirely) instead of letting them
// discover it only when a later invite silently fails with an upgrade
// prompt. Used by both dashboard/team/page.tsx (the detailed view) and
// dashboard/page.tsx (a lightweight heads-up on the home page, so an admin
// doesn't have to specifically visit Team to notice).
export function seatsOverLimit(memberCount: number, plan: string | null | undefined): number {
  const limit = teamMemberLimit(plan);
  if (limit === null) return 0;
  return Math.max(0, memberCount - limit);
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
