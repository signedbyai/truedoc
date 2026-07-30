import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { getConsoleBillingState } from "@/lib/console-usage";
import { ConsoleChat } from "@/components/console-chat";
import { ConsoleUsagePanel } from "@/components/console-usage-panel";
import { consoleAppNextPath } from "@/lib/console-host";

// /console/app (moved from /dashboard/console 2026-07-30 — see
// src/app/console/app/layout.tsx for why) — the actual interactive
// console: a Mistral-backed chat pane that can send/bulk-send/check/void
// documents, next to a live usage meter and spend cap. Gated to Pro+ (see
// api-auth.ts / plan.ts's consoleAccess and apiAccess features) — Free
// orgs are redirected to Settings, where the existing gate line explains
// what unlocks it.
//
// Metered for every plan that reaches this page, Business included
// (2026-07-30, direct instruction) — console is a distinct signing-ops
// product layered on top of a standard plan, not covered by Business's
// separate, unrelated `apiAccess` perk on the plain /api/v1/documents
// endpoint. "Pro plan or higher" above is only the access gate.
//
// ConsoleChat/ConsoleUsagePanel are untouched, still white cards — that
// reads fine floating on the layout's bg-slate-950, same light-card-on-
// dark-chrome pattern most console-style dashboards use, so there was no
// need to reskin either component for this move.
export default async function ConsoleAppPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) {
    const nextPath = consoleAppNextPath((await headers()).get("host"));
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  const { supabase, orgId } = ctx;

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, console_spend_cap_enabled, console_spend_cap_cents, console_cap_intro_seen_at")
    .eq("id", orgId)
    .single();
  if (!org) redirect("/dashboard");

  const hasApiAccess = planHasFeature(org.plan, "apiAccess");
  const hasConsoleAccess = planHasFeature(org.plan, "consoleAccess");
  if (!hasApiAccess && !hasConsoleAccess) redirect("/dashboard/settings");

  const billingState = await getConsoleBillingState(orgId);

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Console</h1>
          <p className="text-sm text-slate-400">
            Send, track, and manage documents by chatting with SignedBy directly — or wire your own AI agent in via{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">/console/tools.json</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <ConsoleChat />
          <ConsoleUsagePanel
            initialState={billingState}
            initialCapEnabled={org.console_spend_cap_enabled}
            initialCapCents={org.console_spend_cap_cents}
            showIntro={!org.console_cap_intro_seen_at}
          />
        </div>
      </div>
    </main>
  );
}
