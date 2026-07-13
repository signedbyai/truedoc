import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { planHasFeature, teamMemberLimit, PLAN_LABEL } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TeamPanel } from "@/components/team-panel";

export default async function TeamPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { supabase, user, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("name, plan").eq("id", orgId).single();
  const hasTeam = planHasFeature(org?.plan, "teamMembers");

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const admin = createAdminClient();
  const members = await Promise.all(
    (memberRows || []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      return { ...m, email: data?.user?.email || "unknown" };
    })
  );

  const { data: invites } = hasTeam
    ? await supabase
        .from("org_invites")
        .select("id, email, role, expires_at")
        .eq("org_id", orgId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Team</h1>
          <p className="text-sm text-slate-600">{org?.name}&apos;s workspace members.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {hasTeam
                ? "Invite teammates to share templates and documents in this workspace."
                : "Everyone here shares documents and templates within this workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasTeam ? (
              <TeamPanel
                currentUserId={user.id}
                members={members}
                invites={invites || []}
                seatLimit={teamMemberLimit(org?.plan)}
                planLabel={PLAN_LABEL[org?.plan ?? "free"]}
              />
            ) : (
              <div className="space-y-4">
                {/* Below Team, there's no numeric seat cap at all (teamMembers
                    is gated as an all-or-nothing feature, not a count) — but
                    an org that downgraded from Team/Business can still have
                    more than one member left over from before, with no team
                    UI at all to explain why invites/removal aren't available
                    anymore. Existing members keep working regardless. */}
                {members.length > 1 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">
                      {members.length} members on a plan without team support
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      This usually happens after a downgrade. Everyone listed below keeps working as normal, but
                      inviting or removing members isn&apos;t available on the {PLAN_LABEL[org?.plan ?? "free"]} plan
                      — upgrade to Team to manage them again.
                    </p>
                  </div>
                )}
                <ul className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.email}</p>
                        <p className="text-xs capitalize text-slate-500">{m.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
                  <p className="text-sm font-medium text-slate-900">Invite your team</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Adding teammates and sharing templates is available on the Team plan and up.
                  </p>
                  <Link href="/pricing" className={buttonVariants({ size: "default", className: "mt-3" })}>
                    Upgrade to Team
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
