import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// Feature gating for paid-tier functionality. Kept as a single source of
// truth so the app logic always matches what pricing-cards.tsx promises —
// see that file for the customer-facing copy these gates enforce.
export type PlanId = "free" | "starter" | "team" | "business";

// Shared display label for a plan id — was duplicated locally in
// dashboard/billing/page.tsx; pulled here once dashboard/team/page.tsx and
// dashboard/page.tsx also needed it (same "extract once a third caller shows
// up" pattern as checkFreePlanCap below).
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
  // Free+: console.signedby.ai access, widened from Pro-only to every plan
  // (CONSOLE_FREE_TIER_SCOPE.md, 2026-08-02, direct instruction — a
  // deliberate reversal of the "Pro+ only" note this comment used to have).
  // Free's console value is real but narrower than Pro's: `templates`
  // (below) stays Pro+-only, so send_document/bulk_send — which both
  // require an existing template — are still unreachable for Free orgs in
  // practice; what Free genuinely gets is Verified Badge sealing (no
  // template needed), gated by its own checkFreePlanSealCap (3 seals/month,
  // independent of the 3-sends/month cap — see plan.ts, 2026-08-05).
  // Pro/Team's `templates` access is what makes
  // console.signedby.ai's send/bulk-send tools actually reachable — this
  // key alone doesn't hand out anything requiring a template. Business
  // orgs already get unlimited included access via `apiAccess` above; Pro/
  // Team get the metered, lower-barrier path. See src/lib/api-auth.ts for
  // how the gates combine at request time.
  consoleAccess: ["free", "starter", "team", "business"],
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
  // "free" (2026-08-02, CONSOLE_FREE_TIER_SCOPE.md) — consoleAccess itself
  // no longer needs an upgrade at all; `templates` is the real thing Free
  // orgs are missing for console's send/bulk-send tools specifically. This
  // map is currently unused elsewhere in the app (kept for consistency with
  // the FEATURE_PLANS table above, not load-bearing).
  consoleAccess: "free",
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

// Free plan: 3 regular sends/month AND, independently, 3 Verified Badge
// seals/month (2026-08-05, direct instruction — "the counter for the 3
// signed docs and the counter for the verified badges are the same counter
// but they should be separate counters... 3 sends and 3 seals"). Previously
// this was ONE counter ("3 new documents/month") checked at document-
// CREATION time (upload/duplicate/draft-finalize/quote-finalize all shared
// checkFreePlanDocCap) — before it was even known whether the document
// would end up sent to a signer or sealed as a Verified Badge, which is
// exactly why the two had to share a pool. The fix moves each check to its
// action's actual COMPLETION moment instead: checkFreePlanSendCap is called
// from the send route right before a document actually goes out;
// checkFreePlanSealCap is called from sealDocumentAction right before a
// seal completes. Each counts by its own timestamp column (sent_at /
// sealed_at, migration 0049) rather than documents.created_at — a Free org
// can now upload/duplicate/draft freely, since creating a draft no longer
// spends anything from either pool.
//
// Typed as the generic `SupabaseClient` (was the session-bound `createClient`
// return type specifically) — API_TIER_SCOPE.md's free-tier API sandbox
// (2026-08-02, direct instruction) needed this same cap enforced from
// api/v1/documents/route.ts, which has no user session and only ever holds
// the service-role admin client. Both clients are structurally the same
// underlying `SupabaseClient`, so this widens the type without changing
// behavior for any existing session-based caller.
// Extracted 2026-08-01 so the Free-tier Settings usage display (see
// getFreePlanUsage below) and the actual cap checks here can't drift apart
// on the definition of "this month" — both need the exact same boundary or
// the numbers shown to a Free user could disagree with what actually blocks
// them.
function startOfCurrentMonthUTC(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Shared by checkFreePlanSendCap/checkFreePlanSealCap below — everything
// past "which column and which limit" is identical: read the org's plan +
// credit balance, count this month's rows past the given timestamp column,
// spend a doc_credits credit (compare-and-swap) instead of blocking if the
// org has a balance, log the hit, and return the 402. Kept private —
// callers only ever need one of the two typed wrappers below, never this
// directly, so there's no ambiguity at a call site about which pool is
// being checked.
async function checkFreePlanCap(
  supabase: SupabaseClient,
  orgId: string,
  countColumn: "sent_at" | "sealed_at",
  blockedMessage: string,
  source: string
): Promise<NextResponse | null> {
  const { data: org } = await supabase.from("organizations").select("plan, doc_credits").eq("id", orgId).single();
  if (org && org.plan !== "free") return null;

  const startOfMonth = startOfCurrentMonthUTC();

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte(countColumn, startOfMonth.toISOString());

  if ((count ?? 0) >= 3) {
    // Credit pack top-up (0044_credit_packs.sql, CONSOLE_FREE_TIER_SCOPE.md
    // item #8) — spend one credit instead of blocking, if the org has a
    // balance. Compare-and-swap update (`.eq("doc_credits", org.doc_credits)`
    // alongside the id match) rather than a plain decrement: Postgres only
    // applies the write if the balance is still what we just read, so two
    // near-simultaneous requests from the same org can't both decrement off
    // a stale read and take the balance negative. If the swap loses the
    // race (someone else's request spent the last credit first), this
    // falls through to the block-and-log path below rather than retrying —
    // a single org isn't expected to have meaningful send/seal concurrency,
    // and worst case they just see the cap message once and try again.
    // Always via a fresh admin client, same reasoning as the log below:
    // session-bound callers have no update policy on organizations.doc_credits
    // for another org's row, but every caller needs this to work for its
    // own org regardless of which client it holds. One shared doc_credits
    // pool spendable against EITHER cap — a referral/top-up credit isn't
    // earmarked "for sending" or "for sealing" specifically.
    if ((org?.doc_credits ?? 0) > 0) {
      const { data: spent } = await createAdminClient()
        .from("organizations")
        .update({ doc_credits: org!.doc_credits - 1 })
        .eq("id", orgId)
        .eq("doc_credits", org!.doc_credits)
        .select("id")
        .maybeSingle();
      if (spent) return null;
    }

    // Best-effort log (2026-08-03, direct ask: "monitor how many users hit
    // the 3-doc limit or attempt a 4th API call"). Always via a fresh
    // admin client, regardless of which client this function was called
    // with — some callers pass a session-bound client with no insert
    // policy on plan_cap_hits (RLS on, no policies, service-role only, same
    // as feedback.sql). Awaited (not fire-and-forget) since serverless
    // functions can be frozen/killed right after the response is sent, but
    // a logging failure still must never block or shadow the real 402
    // below.
    try {
      const { error } = await createAdminClient().from("plan_cap_hits").insert({ org_id: orgId, source });
      if (error) console.error("plan_cap_hits log failed", error);
    } catch (err) {
      console.error("plan_cap_hits log failed", err);
    }

    return NextResponse.json({ error: blockedMessage, upgrade: true }, { status: 402 });
  }
  return null;
}

/** Call right before a document is actually sent to a signer (the send
 *  route, and the REST API's create+send route, which sends in the same
 *  call it creates in). Counts documents.sent_at this month. */
export async function checkFreePlanSendCap(supabase: SupabaseClient, orgId: string, source: string): Promise<NextResponse | null> {
  return checkFreePlanCap(
    supabase,
    orgId,
    "sent_at",
    "You've hit the Free plan's 3 documents/month limit. Upgrade to keep going.",
    source
  );
}

/** Call right before a Verified Badge seal completes (sealDocumentAction).
 *  Counts documents.sealed_at this month — entirely independent of the
 *  send cap above, per 2026-08-05 direct instruction. */
export async function checkFreePlanSealCap(supabase: SupabaseClient, orgId: string, source: string): Promise<NextResponse | null> {
  return checkFreePlanCap(
    supabase,
    orgId,
    "sealed_at",
    "You've hit the Free plan's 3 Verified Badge seals/month limit. Upgrade to keep going.",
    source
  );
}

// Read-only counterpart to the two checks above — same queries, no side
// effects (never spends a credit or logs a cap hit), for surfacing "X of 3
// sends" / "Y of 3 seals" + credit balance in Console's Free-tier Settings
// tab (2026-08-01, direct ask: a Free org referring someone should actually
// be able to see their seal-credits balance go up somewhere, not just
// discover it worked the next time they hit the cap). Split into two
// numbers (2026-08-05) now that sends and seals are genuinely independent
// pools — showing one combined count would disagree with what actually
// blocks a Free org at either action.
export async function getFreePlanUsage(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ sendsUsedThisMonth: number; sealsUsedThisMonth: number; docCredits: number }> {
  const startOfMonth = startOfCurrentMonthUTC().toISOString();
  const [{ data: org }, { count: sendsCount }, { count: sealsCount }] = await Promise.all([
    supabase.from("organizations").select("doc_credits").eq("id", orgId).single(),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId).gte("sent_at", startOfMonth),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId).gte("sealed_at", startOfMonth),
  ]);
  return {
    sendsUsedThisMonth: sendsCount ?? 0,
    sealsUsedThisMonth: sealsCount ?? 0,
    docCredits: org?.doc_credits ?? 0,
  };
}
