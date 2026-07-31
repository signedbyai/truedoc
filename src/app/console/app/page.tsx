import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { getConsoleBillingState } from "@/lib/console-usage";
import { ConsoleWorkspace } from "@/components/console-workspace";
import { consoleAppNextPath } from "@/lib/console-host";

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
export default async function ConsoleAppPage() {
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
  const { data: consoleSettings } = await supabase
    .from("organizations")
    .select("console_spend_cap_enabled, console_spend_cap_cents, console_cap_intro_seen_at")
    .eq("id", orgId)
    .single();

  // Skip the billing-state query entirely when locked — nothing on the
  // locked path reads it (ConsoleUsagePanel isn't rendered), so there's no
  // reason to hit the DB for numbers no one sees.
  const billingState = hasAccess ? await getConsoleBillingState(orgId) : null;

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <ConsoleWorkspace
          plan={org.plan ?? "free"}
          hasAccess={hasAccess}
          initialState={billingState}
          initialCapEnabled={consoleSettings?.console_spend_cap_enabled ?? true}
          initialCapCents={consoleSettings?.console_spend_cap_cents ?? 2500}
          showIntro={!consoleSettings?.console_cap_intro_seen_at}
        />
      </div>
    </main>
  );
}
