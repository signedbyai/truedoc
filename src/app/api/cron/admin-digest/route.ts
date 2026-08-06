import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminDigestEmail } from "@/lib/email";

const ADMIN_TO = "michael@signedby.ai";
const ADMIN_BCC = ["michaeleagles@gmail.com", "suzeteagles@gmail.com", "heneagles@gmail.com", "danseags@gmail.com"];

const DAY_MS = 24 * 60 * 60 * 1000;

// Daily Vercel Cron job (see vercel.json) — a lightweight founder digest so
// checking traction doesn't require building/maintaining a locked admin
// dashboard page. Reuses the same CRON_SECRET-protected pattern as
// /api/cron/reminders.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const dayAgo = now - DAY_MS;
  const weekAgo = now - 7 * DAY_MS;
  const monthAgo = now - 30 * DAY_MS;

  // auth.users isn't exposed over the postgrest client (not in the public
  // schema), so login activity comes from the Admin API's listUsers, which
  // includes last_sign_in_at. Paginated defensively -- fine well past 1000
  // users, this just won't be a single request anymore at that point.
  let loggedInToday = 0;
  let loggedInWeek = 0;
  let loggedInMonth = 0;
  let loggedInEver = 0;
  let totalUsers = 0;
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("Admin digest cron: listUsers failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const u of data.users) {
      totalUsers++;
      if (!u.last_sign_in_at) continue;
      loggedInEver++; // has signed in at least once, distinct from just having an account
      const t = new Date(u.last_sign_in_at).getTime();
      if (t >= dayAgo) loggedInToday++;
      if (t >= weekAgo) loggedInWeek++;
      if (t >= monthAgo) loggedInMonth++;
    }
    if (data.users.length < perPage) break;
    page++;
  }

  const { data: orgs, error: orgsError } = await admin.from("organizations").select("plan");
  if (orgsError) {
    console.error("Admin digest cron: organizations fetch failed", orgsError);
    return NextResponse.json({ error: orgsError.message }, { status: 500 });
  }
  const paidOrgs = (orgs || []).filter((o) => o.plan !== "free").length;
  const freeOrgs = (orgs || []).length - paidOrgs;

  // count: "exact", head: true -- ask Postgres for the row count without
  // actually fetching any rows, since these totals only grow over time and
  // could be large.
  const { count: totalSignings, error: signingsError } = await admin
    .from("signers")
    .select("*", { count: "exact", head: true })
    .eq("status", "signed");
  if (signingsError) {
    console.error("Admin digest cron: signers count failed", signingsError);
    return NextResponse.json({ error: signingsError.message }, { status: 500 });
  }

  const { count: totalDocumentsSigned, error: documentsError } = await admin
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");
  if (documentsError) {
    console.error("Admin digest cron: documents count failed", documentsError);
    return NextResponse.json({ error: documentsError.message }, { status: 500 });
  }

  // Free-plan 3-doc/month cap hits (2026-08-03, direct ask: "monitor how
  // many users hit the 3-doc limit or attempt a 4th API call" + "maybe in
  // the daily email report" — see 0043_plan_cap_hits.sql and
  // checkFreePlanDocCap in lib/plan.ts, the single choke point every
  // document-creating route logs a row to on every 402). Counts rows, not
  // orgs — an org that keeps trying after the first block logs one row per
  // attempt, which is the point: it's a proxy for how much someone actually
  // wants past the wall, not just whether they've seen it once.
  const dayAgoDate = new Date(dayAgo).toISOString();
  const weekAgoDate = new Date(weekAgo).toISOString();
  const monthAgoDate = new Date(monthAgo).toISOString();
  const { count: capHitsToday, error: capHitsTodayError } = await admin
    .from("plan_cap_hits")
    .select("*", { count: "exact", head: true })
    .gte("created_at", dayAgoDate);
  const { count: capHitsWeek, error: capHitsWeekError } = await admin
    .from("plan_cap_hits")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgoDate);
  const { data: capHitsMonthRows, error: capHitsMonthError } = await admin
    .from("plan_cap_hits")
    .select("org_id, source")
    .gte("created_at", monthAgoDate);
  if (capHitsTodayError || capHitsWeekError || capHitsMonthError) {
    console.error(
      "Admin digest cron: plan_cap_hits count failed",
      capHitsTodayError || capHitsWeekError || capHitsMonthError
    );
    // Non-fatal -- this is a lower-stakes section than the core traction
    // numbers above, better to send the digest without it than fail the
    // whole cron over a table that could still need its migration applied.
  }
  const capHitsMonth = capHitsMonthRows?.length ?? 0;
  const apiCapHitsMonth = (capHitsMonthRows || []).filter((r) => r.source === "api_v1_documents").length;

  // Send-vs-seal org grouping (2026-08-06, direct ask: "group together the
  // sign and seal 3-doc cap hits, so it's three groups — cap hit users on
  // both signs & seals, only signs and only seals"). These two caps are
  // independent pools since 0049_split_send_seal_caps.sql, so a single org
  // can show up under either source set (or both) within the same month.
  // Sources are free text (see 0043_plan_cap_hits.sql), so this checks the
  // known set rather than inferring — see checkFreePlanSendCap/
  // checkFreePlanSealCap call sites in verified-badge-actions.ts,
  // documents/[id]/send/route.ts, and api/v1/documents/route.ts.
  const SEAL_CAP_SOURCES = new Set(["console_seal", "mcp_seal", "dashboard_seal"]);
  const orgCapCategories = new Map<string, { send: boolean; seal: boolean }>();
  for (const r of capHitsMonthRows || []) {
    if (!r.org_id) continue;
    const cat = orgCapCategories.get(r.org_id) ?? { send: false, seal: false };
    if (SEAL_CAP_SOURCES.has(r.source)) cat.seal = true;
    else cat.send = true;
    orgCapCategories.set(r.org_id, cat);
  }
  let capHitsBothOrgs = 0;
  let capHitsSendOnlyOrgs = 0;
  let capHitsSealOnlyOrgs = 0;
  for (const cat of orgCapCategories.values()) {
    if (cat.send && cat.seal) capHitsBothOrgs++;
    else if (cat.send) capHitsSendOnlyOrgs++;
    else if (cat.seal) capHitsSealOnlyOrgs++;
  }

  // Credit pack top-ups (0044_credit_packs.sql, CONSOLE_FREE_TIER_SCOPE.md
  // item #8, built 2026-08-03) — packs sold + revenue this month straight
  // off the purchase ledger, and the outstanding balance straight off
  // organizations.doc_credits (a sum, not a row count — one org can hold
  // multiple packs' worth). Same non-fatal treatment as the cap-hits
  // section above: this table can also still need its migration applied.
  const { data: packsMonthRows, error: packsMonthError } = await admin
    .from("credit_purchases")
    .select("amount_cents")
    .gte("created_at", monthAgoDate);
  const { data: freeOrgCredits, error: creditsError } = await admin
    .from("organizations")
    .select("doc_credits")
    .eq("plan", "free")
    .gt("doc_credits", 0);
  if (packsMonthError || creditsError) {
    console.error("Admin digest cron: credit_purchases/doc_credits fetch failed", packsMonthError || creditsError);
  }
  const packsSoldMonth = packsMonthRows?.length ?? 0;
  const packsRevenueMonth = (packsMonthRows || []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0) / 100;
  const outstandingCredits = (freeOrgCredits || []).reduce((sum, o) => sum + (o.doc_credits ?? 0), 0);

  // Disposable-email signup blocks (0050_disposable_email_blocks.sql,
  // 2026-08-06 direct ask: "show me how many logins blocked as disposable
  // emails"). Same non-fatal treatment as the sections above -- this table
  // could still need its migration applied.
  const { count: disposableBlocksToday, error: disposableBlocksTodayError } = await admin
    .from("disposable_email_blocks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", dayAgoDate);
  const { count: disposableBlocksWeek, error: disposableBlocksWeekError } = await admin
    .from("disposable_email_blocks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgoDate);
  const { count: disposableBlocksMonth, error: disposableBlocksMonthError } = await admin
    .from("disposable_email_blocks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthAgoDate);
  if (disposableBlocksTodayError || disposableBlocksWeekError || disposableBlocksMonthError) {
    console.error(
      "Admin digest cron: disposable_email_blocks count failed",
      disposableBlocksTodayError || disposableBlocksWeekError || disposableBlocksMonthError
    );
  }

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    await sendAdminDigestEmail({
      to: ADMIN_TO,
      bcc: ADMIN_BCC,
      dateLabel,
      loggedInToday,
      loggedInWeek,
      loggedInMonth,
      loggedInEver,
      totalUsers,
      freeOrgs,
      paidOrgs,
      totalSignings: totalSignings ?? 0,
      totalDocumentsSigned: totalDocumentsSigned ?? 0,
      capHitsToday: capHitsToday ?? 0,
      capHitsWeek: capHitsWeek ?? 0,
      capHitsMonth,
      capHitsBothOrgs,
      capHitsSendOnlyOrgs,
      capHitsSealOnlyOrgs,
      apiCapHitsMonth,
      packsSoldMonth,
      packsRevenueMonth,
      outstandingCredits,
      disposableBlocksToday: disposableBlocksToday ?? 0,
      disposableBlocksWeek: disposableBlocksWeek ?? 0,
      disposableBlocksMonth: disposableBlocksMonth ?? 0,
    });
  } catch (err) {
    console.error("Admin digest cron: send failed", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({
    loggedInToday,
    loggedInWeek,
    loggedInMonth,
    loggedInEver,
    totalUsers,
    freeOrgs,
    paidOrgs,
    totalSignings: totalSignings ?? 0,
    totalDocumentsSigned: totalDocumentsSigned ?? 0,
    capHitsToday: capHitsToday ?? 0,
    capHitsWeek: capHitsWeek ?? 0,
    capHitsMonth,
    capHitsBothOrgs,
    capHitsSendOnlyOrgs,
    capHitsSealOnlyOrgs,
    apiCapHitsMonth,
    packsSoldMonth,
    packsRevenueMonth,
    outstandingCredits,
    disposableBlocksToday: disposableBlocksToday ?? 0,
    disposableBlocksWeek: disposableBlocksWeek ?? 0,
    disposableBlocksMonth: disposableBlocksMonth ?? 0,
  });
}
