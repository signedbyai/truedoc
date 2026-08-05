import { getUserAndOrg } from "@/lib/org";
import { DashboardNav } from "@/components/dashboard-nav";
import { isDevAccessAllowed } from "@/lib/dev-access";
import { planHasFeature } from "@/lib/plan";
import { SendSealTransitionProvider } from "@/components/send-seal-transition";

// Shared shell for every /dashboard route. Renders the one navigation bar
// (top on desktop, floating pill on mobile) around all pages — replacing the
// per-page hand-rolled headers. Individual pages still call getUserAndOrg()
// and redirect to /login when unauthenticated, so if there's no session here
// we render children bare and let the page handle the redirect. (The double
// getUserAndOrg() — once here, once in the page — is a known small cost of
// keeping pages independently guarded; fine at this scale.)
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserAndOrg();
  if (!ctx) return <>{children}</>;

  const { user, orgId, orgs } = ctx;

  // Preview-subdomain allowlist gate — see dev-access.ts. A no-op (returns
  // true) anywhere DEV_ACCESS_ALLOWLIST isn't set, i.e. production.
  if (!isDevAccessAllowed(user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200/60 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          <h1 className="text-lg font-semibold text-slate-900">Private preview</h1>
          <p className="mt-2 text-sm text-slate-600">
            This is a work-in-progress preview of SignedBy — access is limited to a testing
            allowlist. Email{" "}
            <a href="mailto:michael@signedby.ai" className="font-medium text-slate-900 underline">
              michael@signedby.ai
            </a>{" "}
            and ask him to add <span className="font-medium text-slate-900">{user.email}</span>.
          </p>
        </div>
      </div>
    );
  }

  const firstName =
    ((user.user_metadata?.full_name || user.user_metadata?.name || "") as string).split(" ")[0] || null;

  // Console (CONSOLE_UX_SCOPE.md) is Pro+ — same apiAccess/consoleAccess
  // combination the console page itself gates on. orgs already carries
  // `plan` from getUserAndOrg, so no extra query needed here.
  //
  // Hardcoded false for now (2026-07-30, direct instruction): Michael wants
  // /dashboard/console findable only by going straight to
  // console.signedby.ai while it's still early, not surfaced in the nav —
  // same reasoning as the marketing-page link removal earlier that day.
  // The real gating logic below is left in place, just not used yet, so
  // re-enabling this is a one-line change once it's ready to promote.
  const activeOrg = orgs.find((o) => o.id === orgId);
  const eligibleForConsole =
    !!activeOrg && (planHasFeature(activeOrg.plan, "apiAccess") || planHasFeature(activeOrg.plan, "consoleAccess"));
  void eligibleForConsole;
  const showConsole = false;

  return (
    // SendSealTransitionProvider wraps the whole shell, not just {children}
    // (2026-08-05) — it needs to survive the route change from e.g. the
    // field editor to the document's own page, and DashboardLayout is the
    // nearest ancestor both routes share.
    <SendSealTransitionProvider>
      <div className="min-h-screen bg-slate-50">
        <DashboardNav orgs={orgs} activeOrgId={orgId} userEmail={user.email ?? ""} firstName={firstName} showConsole={showConsole} />
        <div data-dashboard-content className="pb-24 md:pb-0">
          {children}
        </div>
      </div>
    </SendSealTransitionProvider>
  );
}
