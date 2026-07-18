import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { seatsOverLimit, PLAN_LABEL } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LIST_STATUS_PILL, StatusPill } from "@/components/status-pill";
import { cn } from "@/lib/utils";
import { TimeGreeting } from "@/components/time-greeting";
import { ReferralCard } from "@/components/referral-card";
import { AttributionClaim } from "@/components/attribution-claim";

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
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
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
        <div>
          {/* First name from OAuth metadata when present (Google sign-in
              sets full_name/name); email-code signups have neither and
              get the plain greeting. */}
          <h1 className="text-2xl font-semibold text-slate-900">
            <TimeGreeting
              firstName={
                ((user.user_metadata?.full_name || user.user_metadata?.name || "") as string).split(" ")[0] || null
              }
            />
          </h1>
          <p className="text-sm text-slate-600">Signed in as {user.email}</p>
          {user.created_at && (
            <p className="text-xs text-slate-400">
              Member since{" "}
              {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>

        <ReferralCard />
        <AttributionClaim />

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
            {/* Same slim, rounded shape as the field editor's header trio
                (size="sm" + rounded-lg). Scoped to this pair on purpose: the
                app-wide version of this restyle was tried and rolled back, so
                it stays a local override rather than a ui/button.tsx change.

                Equal width, but reached two different ways. From sm up, a
                shared min-w sized off the longer label ("Upload document →").
                On mobile, flex-1 instead: a fixed 10.5rem pair needs 344px and
                the card only offers ~340px even on a 420pt phone, so the min-w
                wrapped them onto separate lines. Splitting the row equally
                keeps them side by side and still equal.

                The arrow is also hidden on mobile. With it, the longer label
                needs 155px a side and only clears on 420pt-and-up devices;
                without it, 136px, which holds from 375pt up. Dropping the
                arrow was preferred over shrinking to text-xs — the type stays
                the same size as the rest of the UI, and the arrow is
                decoration rather than meaning. They're two alternatives for
                starting a document, and unequal boxes read as a primary with
                an afterthought beside it. */}
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Link
                href="/dashboard/templates"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1 rounded-lg px-2.5 sm:min-w-[10.5rem] sm:flex-none sm:px-3"
                )}
              >
                From template<span className="hidden sm:inline"> →</span>
              </Link>
              {/* Stays slate-900, not yellow. Yellow was tried and pulled: the
                  dashboard already has a primary CTA above this card, and two
                  competing yellows in one viewport cancel each other out.
                  Yellow is worth more kept scarce — it marks "Send for
                  signature", the irreversible step, and nothing else. */}
              <Link
                href="/dashboard/documents/new"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "flex-1 rounded-lg px-2.5 sm:min-w-[10.5rem] sm:flex-none sm:px-3"
                )}
              >
                Upload document<span className="hidden sm:inline"> →</span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const pill = LIST_STATUS_PILL[doc.status];
                  return (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="block truncate text-sm font-medium text-slate-900 hover:underline"
                      >
                        {doc.title}
                      </Link>
                      {/* On mobile the pill rides on this line, so the title
                          gets the full row width. The old layout had the pill
                          shrink-0 beside the title, which meant a longer
                          status ate the filename — backwards, since the
                          filename is how you identify the row. */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {pill && (
                          <StatusPill
                            tone={pill.tone}
                            dotTone={pill.dotTone}
                            label={pill.label}
                            className="sm:hidden"
                          />
                        )}
                        <span>
                          {doc.page_count} page{doc.page_count === 1 ? "" : "s"} &middot;{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {/* Desktop keeps the pill right-aligned: it forms a column
                        you can run your eye down, which is the whole point on
                        a wide screen. That alignment doesn't survive
                        truncation on a phone, hence the swap above. */}
                    {pill && (
                      <StatusPill
                        tone={pill.tone}
                        dotTone={pill.dotTone}
                        label={pill.label}
                        className="hidden shrink-0 sm:inline-flex"
                      />
                    )}
                  </li>
                  );
                })}
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
