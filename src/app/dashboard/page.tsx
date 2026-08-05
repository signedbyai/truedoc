import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { seatsOverLimit, PLAN_LABEL } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LIST_STATUS_PILL, SEALED_LIST_PILL, StatusPill } from "@/components/status-pill";
import { BadgeIcon, FirstStepIcon } from "@/components/badge-icon";
import { PrizeDrawPill } from "@/components/prize-draw-pill";
import { tallyStatuses, workspaceStats } from "@/lib/workspace-stats";
import { monthStart, prizeProgress, PRIZE_ENABLED } from "@/lib/prize-draw";
import { cn } from "@/lib/utils";
import { TimeGreeting } from "@/components/time-greeting";
import { ReferralCard } from "@/components/referral-card";
import { AttributionClaim } from "@/components/attribution-claim";
import { NewDocumentButton } from "@/components/new-document-button";

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
    .select("id, title, status, page_count, created_at, is_verified_badge")
    .eq("org_id", orgId)
    // Sealed documents used to be excluded here entirely (Console was their
    // only home — CONSOLE_VERIFIED_BADGE_PROVENANCE_SCOPE.md). Stale now
    // that sealing is a dashboard-native New Document tab
    // (VERIFIED_BADGE_DASHBOARD_SCOPE.md, 2026-08-05, direct ask) — a
    // document sealed from this dashboard belongs in its own "Recent
    // documents" list. Gets its own "Sealed" pill below.
    .order("created_at", { ascending: false })
    .limit(5);

  // Status tally for the workspace card's stats + badge. Counting rows rather
  // than reading a maintained counter — at these volumes a status-only select
  // over one org is cheap, and there's no counter to drift out of sync.
  //
  // PER-USER SCOPE (future settings toggle): this is the only place that would
  // change — add `.eq("owner_id", user.id)` here and the maths in
  // lib/workspace-stats.ts works unaltered. documents.owner_id already exists
  // and references auth.users (0001_init.sql), so no migration is needed and
  // history stays attributable: a user's personal count is correct from day
  // one rather than starting at zero.
  // Sealed documents count here too as of 2026-08-05 (direct ask) — they
  // land straight in "completed" (self-sign completes synchronously), so
  // they fall out of workspaceStats' existing sent/completed/resolved maths
  // unchanged; nothing in workspace-stats.ts needed to change, only which
  // rows this query includes.
  const { data: allStatuses } = await supabase.from("documents").select("status").eq("org_id", orgId);
  const stats = workspaceStats(tallyStatuses((allStatuses ?? []).map((d) => d.status)));

  // Monthly gift-card draw progress. Deliberately a different number from the
  // badge: the badge counts documents sent, which is fine for a badge, but
  // with a prize attached "sent" is trivially gamed by mailing yourself a
  // hundred documents. This counts distinct recipients who actually signed —
  // every point needs a real person to open a link and act.
  //
  // Read from signers.signed_at rather than documents, because documents has
  // no completed_at; signed_at is the only timestamp that says when signing
  // actually happened.
  const now = new Date();
  const { data: monthSignatures } = await supabase
    .from("signers")
    .select("email, signed_at, documents!inner(org_id)")
    .eq("documents.org_id", orgId)
    .eq("status", "signed")
    .gte("signed_at", monthStart(now).toISOString());

  // No member-email exclusion here, deliberately. Two reasons:
  //
  // It can't be done cheaply or consistently. There is no public users table —
  // organization_members holds user_id, and the team page resolves each email
  // through the admin client one call at a time. Doing that on every dashboard
  // load would be wasteful, and excluding only the *viewing* user's address
  // would be worse: the same workspace would show a different number depending
  // on who was looking at it.
  //
  // And distinctness already does the work. Mailing yourself a hundred
  // documents scores one point, not a hundred. Reaching the threshold needs
  // that many separate people to each open a link and sign, so the cheap
  // gaming route is closed without needing the exclusion at all. The lib still
  // supports excludeEmails if a specific abuse case ever shows up.
  const prize = prizeProgress({
    signed: (monthSignatures ?? []).map((s) => ({
      email: s.email,
      signedAt: new Date(s.signed_at as string),
    })),
    now,
  });

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
              {/* Name on its own line, plan and status on a second. The old
                  single line — "{name} — plan: {plan}" plus the pill — wrapped
                  on mobile, and where it wrapped depended on how long the
                  person's name happened to be, so it looked fine for some
                  accounts and broken for others. Stacking removes the
                  dependency entirely rather than buying back a few pixels.
                  Costs one line of height; worth it for a line that can't
                  break. */}
              {orgs.map((o) => (
                <li key={o.id}>
                  <p className="truncate">{o.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Plan: <strong className="font-medium text-slate-700">{PLAN_LABEL[o.plan] ?? o.plan}</strong>
                    </span>
                    {/* Was solid slate-900 with white text — the heaviest
                        treatment in the app, spent on a label that only
                        passively confirms state. Now the same grammar as the
                        document list pills: grey background because it needs
                        nothing from you, green dot because the state is good. */}
                    {o.id === orgId && <StatusPill tone="gray" dotTone="green" label="Active" />}
                  </div>
                </li>
              ))}
            </ul>

            {/* Badge only. The Sent / Signed / Completion cards were built and
                pulled — three number tiles cost a lot of vertical space on a
                card whose job is to tell you which workspace you're in, and
                the badge line already carries the count. workspaceStats still
                computes them (and they're tested), so restoring the row is a
                paste, not a rebuild.

                Nothing here is ever a rebuke. A brand new workspace gets a
                prompt, not a row of zeroes under a greyed-out hat — most
                accounts are new. Badges are volume-based so they can only ever
                be gained, never lost. */}
            {/* The icon sits in a filled circle rather than loose on the
                panel. A badge needs an enclosing shape — a bare line icon next
                to text reads as a list item, not something earned. Dark
                medallion with a yellow glyph over a plain white panel, rather
                than the large amber field first tried: that block of colour sat
                right under the yellow nav underline and spent the accent on a
                passive achievement. */}
            {/* No inner border. The badge sat in a bordered box inside the
                Card's own bordered box, and nested containers flatten
                everything — it read as a form row rather than something
                earned. The Card is already the container; deleting the inner
                frame gives the medallion room to be the object.

                The "BADGE EARNED" caption does more work than any styling: the
                row previously said "First send / 5 documents sent", which could
                just as easily be a status field. One line of text is what
                actually makes it read as an achievement. */}
            {stats.earned ? (
              <div className="mt-5 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-yellow-300">
                  <BadgeIcon id={stats.earned.id} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Badge earned
                  </p>
                  <p className="text-[15px] font-medium text-slate-900">{stats.earned.label}</p>
                  <p className="text-xs text-slate-500">
                    {/* "sent or sealed" (2026-08-05, direct ask) — this count
                        now includes Verified Badge seals (see the query
                        above), so the caption needs to say so rather than
                        implying every one of these went out to a signer. */}
                    {stats.sent} document{stats.sent === 1 ? "" : "s"} sent or sealed
                    {stats.next && ` · next badge at ${stats.next.threshold}`}
                  </p>
                </div>
              </div>
            ) : (
              /* No caption here — nothing has been earned yet, and "Badge
                 earned" above an empty state would be the rebuke this card is
                 built to avoid. */
              <div className="mt-5 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FirstStepIcon />
                </span>
                <div>
                  <p className="text-[15px] font-medium text-slate-900">Send your first document</p>
                  <p className="text-xs text-slate-500">Earn your first badge</p>
                </div>
              </div>
            )}

            {/* Dark until legal sign-off — PRIZE_ENABLED gates the whole
                block so nothing about the prize is in the tree at all, rather
                than shipped and hidden with CSS where it could be found in the
                markup. The maths above still runs; it's cheap and keeps the
                code exercised so it doesn't rot while it waits.

                The number shown differs from the badge's on purpose — see the
                prizeProgress query above for why a prize can't count "sent". */}
            {PRIZE_ENABLED && (
              <PrizeDrawPill
                count={prize.count}
                threshold={prize.threshold}
                qualified={prize.qualified}
              />
            )}
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
                shared min-w sized off the longer label ("New document →").
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
                an afterthought beside it.

                The right-hand button is a client component (NewDocumentButton),
                not a plain Link like the one on its left — it owns the
                first-visit popover explaining AI Drafter/Magic Quote live
                behind it now too. flex-1/sm:flex-none/sm:min-w live inside
                that component so it still matches this Link's sizing exactly. */}
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
              <NewDocumentButton />
            </div>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const pill = doc.is_verified_badge && doc.status === "completed" ? SEALED_LIST_PILL : LIST_STATUS_PILL[doc.status];
                  return (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="block truncate text-sm font-medium text-slate-900 hover:underline"
                      >
                        {doc.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {doc.page_count} page{doc.page_count === 1 ? "" : "s"} &middot;{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {/* One pill, right-aligned at every width. A second copy
                        on the meta line for mobile was tried and dropped —
                        two pills per row read as a duplicate, not a
                        responsive swap. The title truncates instead, which is
                        the trade: short labels here keep that rare. */}
                    {pill && (
                      <StatusPill
                        tone={pill.tone}
                        dotTone={pill.dotTone}
                        label={pill.label}
                        className="shrink-0"
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
