import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { FlagValues } from "flags/react";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature, getFreePlanUsage } from "@/lib/plan";
import { getConsoleBillingState } from "@/lib/console-usage";
import { ConsoleWorkspace } from "@/components/console-workspace";
import { consoleAppNextPath } from "@/lib/console-host";
import { resolveIdentityStatus } from "@/lib/identity";
import { AttributionClaim } from "@/components/attribution-claim";
import { getRequestCurrency } from "@/lib/currency.server";
import { consoleHeroIconFlag } from "@/flags";

// /console/app (moved from /dashboard/console 2026-07-30 — see
// src/app/console/app/layout.tsx for why) — the actual interactive
// console: a Mistral-backed chat pane that can send/bulk-send/check/void
// documents, next to a chat-history sidebar and a live usage meter/spend
// cap (see console-workspace.tsx for the layout). Gated to Pro+ (see
// api-auth.ts / plan.ts's consoleAccess and apiAccess features).
//
// Free orgs are no longer redirected away (2026-07-31, direct
// instruction) — they land on this same page so they can see what
// console does, but ConsoleWorkspace renders a locked/upsell state
// instead of the real chat + history + usage panel: a plan status
// pill (always shown, every plan) plus, when locked, example prompts
// and an upgrade CTA in place of the other left-hand boxes. The actual
// chat is never mounted for a locked org, and /api/console/chat
// independently 402s any request from a Free org regardless of what
// the client renders — this page's gate is about the experience, not
// the only enforcement.
//
// Metered for every plan that reaches this page, Business included
// (2026-07-30, direct instruction) — console is a distinct signing-ops
// product layered on top of a standard plan, not covered by Business's
// separate, unrelated `apiAccess` perk on the plain /api/v1/documents
// endpoint. "Pro plan or higher" above is only the access gate.
//
// No page heading or intro line here (2026-07-31, direct feedback across
// two passes) — the layout's own header already names "console" via its
// badge, a second "Console" <h1> here just repeated it, and the one-line
// intro ("Send, track, and manage documents by chatting with SignedBy
// directly") was cut too as no longer needed. (Earlier still: an "or wire
// your own AI agent in via /console/tools.json" clause was dropped from
// that same line per feedback questioning whether it was built — it
// actually is, a real working tool manifest for external agents, see
// src/app/console/tools.json/route.ts — just worded ambiguously close to
// BYOK, a genuinely unbuilt phase-2 idea, see CONSOLE_UX_SCOPE.md; still
// documented at /developers.)
export default async function ConsoleAppPage({
  searchParams,
}: {
  // ?c=<conversationId> (2026-08-02, TEMPLATE_BROWSE_SCOPE.md) — set by the
  // field editor's "Back to Console" button when it knows which
  // conversation the user came from (see field-editor.tsx's
  // consoleConversationId prop). Threaded through to ConsoleWorkspace so it
  // can auto-select that conversation on mount instead of always opening a
  // blank new chat — the actual fix for "closing the editor loses my
  // conversation," since target="_blank" already keeps the original tab
  // alive but there's no programmatic way back to that specific tab (see
  // the scope doc for why).
  searchParams: Promise<{ c?: string }>;
}) {
  const { c: initialConversationId } = await searchParams;
  const ctx = await getUserAndOrg();
  if (!ctx) {
    const nextPath = consoleAppNextPath((await headers()).get("host"));
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  const { supabase, orgId, orgs } = ctx;

  // Plan/access come from `orgs` — the exact same data getUserAndOrg()
  // already fetched (and the exact same source the dashboard reads its own
  // plan from) — NOT a second, separate query. Previously this page ran
  // its own `organizations.select("plan", ...).eq("id", orgId).single()`
  // right after getUserAndOrg() had already fetched that same org's plan
  // moments earlier; that redundant round-trip was a real, concrete
  // divergence from how the dashboard resolves plan, and the prime
  // suspect for a live bug report (2026-07-31): console showed "Free" for
  // a confirmed Business account, specifically right after a forced
  // re-sign-in on Safari — exactly the kind of session-timing window a
  // second, separate DB read is more exposed to than reusing data already
  // in hand. Removing the redundant query doesn't just plug a suspected
  // race, it makes plan/access resolution here byte-identical to the
  // dashboard's, closing off that whole class of divergence for good.
  const org = orgs.find((o) => o.id === orgId);
  if (!org) redirect("/dashboard");

  const hasApiAccess = planHasFeature(org.plan, "apiAccess");
  const hasConsoleAccess = planHasFeature(org.plan, "consoleAccess");
  const hasAccess = hasApiAccess || hasConsoleAccess;

  // Only the console-specific cap/intro settings still need their own
  // query — they're not part of getUserAndOrg()'s org-list shape. A
  // hiccup here can only ever degrade the cap UI to sane defaults
  // (matching migration 0040's own DB defaults), never misreport plan.
  // verified_badge_certificate_mode + the identity columns (migration 0042)
  // ride along here too, since Verified Badge's Settings panel moved into
  // Console's own Settings tab 2026-08-01 (was briefly on /dashboard/settings
  // — moved after direct feedback that Console/MCP-only activity shouldn't
  // require a trip to the separate dashboard to manage).
  const { data: consoleSettings } = await supabase
    .from("organizations")
    .select(
      "console_spend_cap_enabled, console_spend_cap_cents, console_cap_intro_seen_at, verified_badge_certificate_mode, identity_verified_at, identity_verified_name"
    )
    .eq("id", orgId)
    .single();
  const identityStatus = resolveIdentityStatus(consoleSettings ?? { identity_verified_at: null, identity_verified_name: null });

  // Skip the billing-state query entirely when locked — nothing on the
  // locked path reads it (ConsoleUsagePanel isn't rendered), so there's no
  // reason to hit the DB for numbers no one sees.
  const billingState = hasAccess ? await getConsoleBillingState(orgId) : null;

  // Free-tier Settings usage display (2026-08-01, direct ask: a Free org
  // that gets referral seal credits should be able to actually see the
  // balance somewhere, not just discover it worked next time they hit the
  // cap). Only fetched for Free orgs — Pro+ has its own ConsoleUsagePanel
  // fed by billingState above, this is the Free-only counterpart.
  const freePlanUsage = hasAccess && org.plan === "free" ? await getFreePlanUsage(supabase, orgId) : null;

  // Same geo/cookie resolution the pricing pages and checkout routes use
  // (2026-08-01, direct bug report: the "Buy 25 more" credit-pack button
  // said a hardcoded "$5" regardless of where the visitor actually was —
  // see stripe.ts's creditPackPriceFor). Only matters for Free orgs (the
  // only ones who ever see that button), but resolved unconditionally
  // since it's a cheap header/cookie read, not a DB query.
  const currency = await getRequestCurrency();

  // Hero icon color test (2026-08-04, CONSOLE_VERIFIED_BADGE_FOCUS_REDESIGN_
  // SCOPE.md) — resolved unconditionally like the other flags on this page,
  // cheap and doesn't depend on `hasAccess` since the empty-state hero
  // renders for every plan including locked/Free.
  const heroIconVariant = await consoleHeroIconFlag();

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <FlagValues values={{ "console-hero-icon-color": heroIconVariant }} />
        {/* This page previously never claimed first-touch attribution at all
            (2026-08-01 finding, following the console sign-up/login audit)
            — AttributionClaim only lived on /dashboard/page.tsx, but a
            console-only signup (e.g. from /verified-badge's CTA, see the
            utm_* params added there) lands here directly and never visits
            /dashboard (auth/callback special-cases next=/app straight to
            consoleUrl("/app")). Mounted unconditionally, not gated behind
            hasAccess — Free/locked orgs are exactly the cohort this was
            missing for. See [[signup-attribution]]. */}
        <AttributionClaim />
        <ConsoleWorkspace
          plan={org.plan ?? "free"}
          hasAccess={hasAccess}
          initialConversationId={initialConversationId ?? null}
          initialState={billingState}
          initialCapEnabled={consoleSettings?.console_spend_cap_enabled ?? true}
          initialCapCents={consoleSettings?.console_spend_cap_cents ?? 2500}
          showIntro={!consoleSettings?.console_cap_intro_seen_at}
          // Defaults to "both" rather than "ask" (2026-08-05, direct ask:
          // "let's assume both for now and skip the question so people can
          // get to the sealed file faster") — an org that's never touched
          // this setting now skips straight to a confirm bubble with both
          // files, no conversational appended/separate/both question first.
          // Fully reversible per-org, self-serve, no code change needed:
          // the Settings dropdown (verified-badge-settings.tsx) still has
          // "Ask me every time" as a real option — this only changes what
          // an org that's never opened that dropdown gets by default.
          certificateModePreference={
            (consoleSettings?.verified_badge_certificate_mode as "ask" | "appended" | "separate" | "both" | undefined) ?? "both"
          }
          identityVerified={identityStatus.verified}
          identityVerifiedName={identityStatus.verified ? identityStatus.name : null}
          identityVerifiedAt={identityStatus.verified ? identityStatus.verifiedAt : null}
          identityStale={identityStatus.verified ? identityStatus.stale : false}
          freePlanSealsUsedThisMonth={freePlanUsage?.sealsUsedThisMonth ?? null}
          freePlanSendsUsedThisMonth={freePlanUsage?.sendsUsedThisMonth ?? null}
          freePlanDocCredits={freePlanUsage?.docCredits ?? null}
          currency={currency}
          heroIconVariant={heroIconVariant}
        />
      </div>
    </main>
  );
}
