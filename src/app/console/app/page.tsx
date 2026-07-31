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
// No page heading here (2026-07-31, direct feedback) — the layout's own
// header already names "console" via its badge, a second "Console" <h1>
// here just repeated it. Intro copy trimmed to one line; the earlier
// "or wire your own AI agent in via /console/tools.json" clause was
// dropped per feedback questioning whether it was built — it actually is
// (a real, working tool manifest for external agents, see
// src/app/console/tools.json/route.ts), just worded ambiguously close to
// BYOK (a genuinely unbuilt phase-2 idea, see CONSOLE_UX_SCOPE.md) — left
// out here rather than re-explaining the distinction inline; still
// documented at /developers.
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
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="text-sm text-slate-400">Send, track, and manage documents by chatting with SignedBy directly.</p>

        <ConsoleWorkspace
          initialState={billingState}
          initialCapEnabled={org.console_spend_cap_enabled}
          initialCapCents={org.console_spend_cap_cents}
          showIntro={!org.console_cap_intro_seen_at}
        />
      </div>
    </main>
  );
}
