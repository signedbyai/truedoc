import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, plan)")
    .eq("user_id", user.id);

  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, status, page_count, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-600">Signed in as {user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
            <CardTitle>Your workspace</CardTitle>
            <CardDescription>
              A personal workspace was created automatically when you signed up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memberships && memberships.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {memberships.map((m, i) => (
                  <li key={i}>
                    {/* organizations comes back as an array from the join */}
                    {Array.isArray(m.organizations)
                      ? m.organizations.map((o) => (
                          <span key={o.id}>
                            {o.name} — plan: <strong>{o.plan}</strong>
                          </span>
                        ))
                      : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No workspace found yet.</p>
            )}
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
