import { getUserAndOrg } from "@/lib/org";
import { DashboardNav } from "@/components/dashboard-nav";

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
  const firstName =
    ((user.user_metadata?.full_name || user.user_metadata?.name || "") as string).split(" ")[0] || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav orgs={orgs} activeOrgId={orgId} userEmail={user.email ?? ""} firstName={firstName} />
      <div data-dashboard-content className="pb-24 md:pb-0">
        {children}
      </div>
    </div>
  );
}
