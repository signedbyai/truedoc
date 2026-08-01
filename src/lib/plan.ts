import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  starter: "Pro",
  team: "Team",
  business: "Business",
};

const FEATURE_PLANS = {
  // Pro: "Templates & reminders" — saving/using templates and both
  // manual + automatic signer reminders.
  templates: ["starter", "team", "business"],
  reminders: ["starter", "team", "business"],
  // Pro: "AI-drafted documents" — the plain-language-ask drafting
  // feature. Gated here (unlike document-summary/field-suggestion, which
  // stay free) because it's the one feature calling the pricier Sonnet
  // model instead of Haiku, and it's a convenience/productivity feature
  // layered on top of core send-and-sign, not core functionality itself —
  // same shape as templates/reminders. Enforced at the draft-generation
  // call (src/app/api/documents/draft/route.ts), not just finalize, since
  // that's where the actual Anthropic cost is incurred.
  aiDraft: ["starter", "team", "business"],
  // Pro: per-page view-time/engagement tracking on a document a signer
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
  // Business: full white-label on the signing page — org name, logo, and
  // brand colour. Reverted back to business-only 2026-08-02
  // (API_TIER_SCOPE.md, direct instruction: "team should not have the
  // branding so that makes business a bigger step"), undoing the 2026-07-17
  // merge that had collapsed this into one team+business promise. That
  // merge was sound *given API access was still Business's differentiator*
  // — once this scope doc moved API access to Pro (see `apiAccess` below,
  // now effectively superseded by `consoleAccess` for Pro/Team), Business
  // needed a replacement, and branding exclusivity is it. Both keys kept —
  // `branding` gates removing SignedBy's mark, `customBranding` gates the
  // logo/colour controls — so callers don't all have to change.
  branding: ["business"],
  customBranding: ["business"],
  // Business: still the only genuinely unlimited/unmetered REST API access
  // (API_TIER_SCOPE.md) — Pro/Team now get real API + webhook access too
  // (see `consoleAccess` below and api-auth.ts's `authenticateApiRequest`),
  // but it stays metered there rather than becoming unlimited, since
  // Console's bulk-send has no volume cap of its own and metering is the
  // only safety valve against unbounded bulk sends at a lower tier.
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
  // Pro+: console.signedby.ai metered API access (CONSOLE_AI_SIGNING_SCOPE.md).
  // Deliberately the same tier list as `templates` — the real requirement is
  // "has a template to send," which is what makes API document creation
  // possible at all, not a separate business decision about who "deserves"
  // API access. Business orgs already get unlimited included access via
  // `apiAccess` above; this is the metered, lower-barrier path for orgs that
  // don't have (or want) Business. See src/lib/api-auth.ts for how the two
  // gates combine at request time.
  consoleAccess: ["starter", "team", "business"],
} as const;

// Per-recipient authentication (a sender can require a signer to enter a
// one-time email code before the signing link opens the document) was
// originally scoped as Business-tier here, then explicitly moved to free
// on every plan (2026-07-20, direct instruction) — same shape as
// recipient_notice/invite_subject/invite_message/expires_at, none of which
// have a FEATURE_PLANS entry either. See PER_RECIPIENT_AUTH_SCOPE.md
// (project root) and src/app/api/sign/[token]/auth/*.

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
  branding: "business",
  customBranding: "business",
  apiAccess: "business",
  paymentCollection: "business",
  docGate: "business",
  consoleAccess: "starter",
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
//
// Typed as the generic `SupabaseClient` (was the session-bound `createClient`
// return type specifically) — API_TIER_SCOPE.md's free-tier API sandbox
// (2026-08-02, direct instruction) needed this same cap enforced from
// api/v1/documents/route.ts, which has no user session and only ever holds
// the service-role admin client. Both clients are structurally the same
// underlying `SupabaseClient`, so this widens the type without changing
// behavior for any existing session-based caller.
export async function checkFreePlanDocCap(
  // Bare `SupabaseClient` (no generics) — both the session client
  // (createServerClient) and the admin client (createAdminClient) are
  // SupabaseClient instances with no shared Database generic declared
  // anywhere in this codebase, so the library's own default type params
  // apply to both without needing an explicit `any` here.
  supabase: SupabaseClient,
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
