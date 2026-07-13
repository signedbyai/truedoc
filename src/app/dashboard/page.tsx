import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { seatsOverLimit, PLAN_LABEL } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { OrgSwitcher } from "@/components/org-switcher";
import { LogoutLink } from "@/components/logout-link";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  completed: "Completed",
  declined: "Declined",
  voided: "Voided",
};

// Protected dashboard shell — middleware already redirects unauthenticated
// requests to /login, this is a second server-side check as defense in depth.
export default async function DashboardPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { supabase, user, orgId, orgs } = ctx;

  // Scoped to the active org specifically — previously this had no org_id
  // filter at all, which only "worked" by accident when a user belonged to
  // just one org (RLS still restricted rows to orgs they're a member of,
  // but a user in 2+ orgs would see the 5 most recent documents across
  // *both* mixed together). A real bug that only became reachable once
  // switching between real, distinct orgs was possible.
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, status, page_count, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Lightweight heads-up if the active org currently has more members than
  // its plan allows — most commonly right after a downgrade via Stripe's
  // own portal, which happens entirely outside this app. Shown here too
  // (not just on the Team page) since an admin might not think to check
  // Team right after downgrading from Billing. Existing members always
  // keep working either way — this is purely a heads-up, not an
  // enforcement point (see seatsOverLimit's doc comment in plan.ts).
  let seatWarning: { over: number; plan: string } | null = null;
  const activeOrg = orgs.find((o) => o.id === orgId);
  if (activeOrg) {
    const { count: memberCount } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    const over = seatsOverLimit(memberCount ?? 0, activeOrg.plan);
    if (over > 0) seatWarning = { over, plan: PLAN_LABEL[activeOrg.plan] ?? activeOrg.plan };
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {seatWarning && (
          <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">
              Your workspace is over its {seatWarning.plan} plan seat limit by {seatWarning.over}{" "}
              member{seatWarning.over === 1 ? "" : "s"}. Existing members keep working, but new invites are blocked.
            </p>
            <Link href="/dashboard/team" className="whitespace-nowrap text-sm font-medium text-amber-900 underline">
              Manage team →
            </Link>
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-600">
              Signed in as {user.email} · <LogoutLink />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <OrgSwitcher orgs={orgs} activeOrgId={orgId} />
            <Link href="/dashboard/documents" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Documents
            </Link>
            <Link href="/dashboard/templates" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Templates
            </Link>
            <Link href="/dashboard/team" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Team
            </Link>
            <Link href="/dashboard/settings" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Settings
            </Link>
            <Link href="/dashboard/billing" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Billing
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your workspace{orgs.length > 1 ? "s" : ""}</CardTitle>
            <CardDescription>
              {orgs.length > 1
                ? "Every organization you belong to. Switch which one is active from the dropdown above."
                : "A personal workspace was created automatically when you signed up."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              {orgs.map((o) => (
                <li key={o.id} className="flex items-center gap-2">
                  <span>
                    {o.name} — plan: <strong>{o.plan}</strong>
                  </span>
                  {o.id === orgId && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                      Active
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent documents</CardTitle>
              <CardDescription>Upload a PDF and place signature fields.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard/templates" className={buttonVariants({ variant: "outline", size: "default" })}>
                From template
              </Link>
              <Link href="/dashboard/documents/new" className={buttonVariants({ size: "default" })}>
                Upload document
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        {doc.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {doc.page_count} page{doc.page_count === 1 ? "" : "s"} &middot;{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {STATUS_LABEL[doc.status] ?? doc.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No documents yet — upload your first PDF to get started.</p>
            )}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <Link href="/dashboard/documents" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                View all documents →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
