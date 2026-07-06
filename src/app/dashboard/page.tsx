import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-600">Signed in as {user.email}</p>
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
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Upload &amp; field-placement editor lands in Week 3&ndash;4 of the build.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
