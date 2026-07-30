import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { getConsoleBillingState } from "@/lib/console-usage";
import { ConsoleChat } from "@/components/console-chat";
import { ConsoleUsagePanel } from "@/components/console-usage-panel";

// /dashboard/console (CONSOLE_UX_SCOPE.md) — the actual interactive
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
export default async function ConsolePage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
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
          <h1 className="text-2xl font-semibold text-slate-900">Console</h1>
          <p className="text-sm text-slate-600">
            Send, track, and manage documents by chatting with SignedBy directly — or wire your own AI agent in via{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/console/tools.json</code>.
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
