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
  // Template-cap sources (2026-08-19, see templateCapHitsMonth below) are
  // deliberately excluded from the today/week counts here — this section
  // is specifically the Free plan's 3-documents/month send-or-seal cap, and
  // the 1-template cap is a structurally different, non-monthly limit (same
  // reasoning as why checkFreePlanTemplateCap in plan.ts isn't just another
  // branch of checkFreePlanCap). Left in one shared table rather than a
  // second one (0043_plan_cap_hits.sql's `source` is free text specifically
  // so new cap types don't need a migration), but the digest still needs to
  // keep them apart so "3-doc cap hits" doesn't quietly start counting
  // something else.
  const TEMPLATE_CAP_SOURCES = ["save_as_template", "console_chat_save_as_template"];
  const { count: capHitsToday, error: capHitsTodayError } = await admin
    .from("plan_cap_hits")
    .select("*", { count: "exact", head: true })
    .gte("created_at", dayAgoDate)
    .not("source", "in", `(${TEMPLATE_CAP_SOURCES.join(",")})`);
  const { count: capHitsWeek, error: capHitsWeekError } = await admin
    .from("plan_cap_hits")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgoDate)
    .not("source", "in", `(${TEMPLATE_CAP_SOURCES.join(",")})`);
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
  // Free-plan 1-template cap hits (2026-08-19, FREE_TIER_ONE_TEMPLATE_SCOPE.md
  // decision 4: "log when a free org hits the 1 template cap, add it as a
  // line in the daily admin email"). Reuses the capHitsMonthRows already
  // fetched above rather than a new query — same plan_cap_hits table,
  // logged by checkFreePlanTemplateCap in plan.ts from both save-as-
  // template call sites (the dashboard route and console-actions.ts's
  // saveAsTemplateAction). Computed before capHitsMonth below so that count
  // can exclude these rows the same way the today/week counts do above.
  const templateCapHitsMonth = (capHitsMonthRows || []).filter((r) => TEMPLATE_CAP_SOURCES.includes(r.source)).length;
  const capHitsMonth = (capHitsMonthRows || []).filter((r) => !TEMPLATE_CAP_SOURCES.includes(r.source)).length;
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
    // Template-cap hits are neither a send nor a seal cap hit — skip them
    // here too, same reasoning as capHitsMonth above, otherwise they'd
    // silently fall into the `else` branch and get miscounted as sends.
    if (TEMPLATE_CAP_SOURCES.includes(r.source)) continue;
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

  // Trusted-timestamp TSA-tier breakdown (2026-08-13, direct ask: "is there
  // a way to verify [EuroTSA is] up and working from the signedby site
  // rather than needing a separate monitoring tool"). Better Stack's ping
  // only confirms /tsr responds; this checks something a synthetic ping
  // can't -- whether EuroTSA is actually being selected and succeeding
  // during REAL signing/sealing traffic. Both write paths
  // (sign/[token]/submit/route.ts and verified-badge-actions.ts) stamp
  // which tier won onto that document's "completed" audit_events row;
  // `timestamp_tsa` is left null only when all three TSAs failed and the
  // fallback chain let sealing proceed without a timestamp at all --
  // deliberately silent by design (TIMESTAMP_AUTHORITY_SCOPE.md), which is
  // exactly why it needs a passive check like this one rather than relying
  // on nobody noticing. If EuroTSA's share quietly drops to 0% here while
  // completions are still non-trivial, that's a real signal Better Stack's
  // uptime ping wouldn't catch (e.g. it answers health-checks fine but is
  // failing on some other request path). Same non-fatal treatment as the
  // sections above -- reused rather than blocking the whole digest.
  const { data: tsaMonthRows, error: tsaError } = await admin
    .from("audit_events")
    .select("created_at, timestamp_tsa")
    .eq("event_type", "completed")
    .gte("created_at", monthAgoDate);
  if (tsaError) {
    console.error("Admin digest cron: audit_events TSA fetch failed", tsaError);
  }
  type TsaTier = "sectigo" | "eurotsa" | "freetsa" | "none";
  function tallyTsa(rows: { timestamp_tsa: string | null }[]) {
    const tally: Record<TsaTier, number> = { sectigo: 0, eurotsa: 0, freetsa: 0, none: 0 };
    for (const r of rows) {
      const tier = (r.timestamp_tsa as TsaTier | null) ?? "none";
      tally[tier]++;
    }
    return tally;
  }
  const tsaRowsWeek = (tsaMonthRows || []).filter((r) => new Date(r.created_at).getTime() >= weekAgo);
  const tsaTallyWeek = tallyTsa(tsaRowsWeek);
  const tsaTallyMonth = tallyTsa(tsaMonthRows || []);

  // Conversions API send health (2026-08-13, direct ask: surface CAPI send
  // failures "instead of you finding out weeks later from a suspiciously
  // flat conversion count"). See 0056_conversion_sends.sql — the sends are
  // fire-and-forget by design, so without this every failure mode is a
  // silent one. Three distinct problems this distinguishes:
  //   * no rows at all      -> no signup carried a click ID (ad-side issue,
  //                            or simply no ad-driven signups that week)
  //   * all 'skipped'       -> env vars not set in Vercel
  //   * all 'failed'/'error'-> expired LinkedIn OAuth token (~60-day
  //                            lifetime, shows as 401) or payload schema drift
  // Same non-fatal treatment as the sections above.
  const { data: capiWeekRows, error: capiError } = await admin
    .from("conversion_sends")
    .select("platform, outcome, status_code, error, created_at")
    .gte("created_at", weekAgoDate)
    .order("created_at", { ascending: false });
  if (capiError) {
    console.error("Admin digest cron: conversion_sends fetch failed", capiError);
  }
  type CapiTally = { ok: number; failed: number; error: number; skipped: number };
  function tallyCapi(platform: "reddit" | "linkedin"): CapiTally {
    const t: CapiTally = { ok: 0, failed: 0, error: 0, skipped: 0 };
    for (const r of capiWeekRows || []) {
      if (r.platform !== platform) continue;
      const outcome = r.outcome as keyof CapiTally;
      if (outcome in t) t[outcome]++;
    }
    return t;
  }
  const capiReddit = tallyCapi("reddit");
  const capiLinkedin = tallyCapi("linkedin");
  // Most recent non-OK message, as a starting point for debugging — rows are
  // already sorted newest-first above.
  const capiLastError =
    (capiWeekRows || []).find((r) => r.outcome === "failed" || r.outcome === "error")?.error ?? null;

  // API usage visibility (API_USAGE_VISIBILITY_SCOPE.md, 2026-08-18 direct
  // ask: "is anyone calling this at all" / "can I even see what CRM is
  // calling the API?"). authenticateApiRequest() (lib/api-auth.ts) is the
  // single choke point every /api/v1/* + /api/mcp handler goes through, and
  // now logs one row per successful call to api_usage
  // (0059_api_usage.sql) — before this there was zero visibility, only
  // apiCapHitsMonth above (which counts *blocked* free-tier attempts, an
  // anti-signal, not a usage signal). Same non-fatal treatment as the
  // sections above.
  const { data: apiUsageMonthRows, error: apiUsageMonthError } = await admin
    .from("api_usage")
    .select("org_id, user_agent, created_at")
    .gte("created_at", monthAgoDate)
    .order("created_at", { ascending: false }); // newest-first, relied on below
  if (apiUsageMonthError) {
    console.error("Admin digest cron: api_usage fetch failed", apiUsageMonthError);
  }
  const apiUsageRows = apiUsageMonthRows || [];
  const apiUsageRowsToday = apiUsageRows.filter((r) => new Date(r.created_at).getTime() >= dayAgo);
  const apiUsageRowsWeek = apiUsageRows.filter((r) => new Date(r.created_at).getTime() >= weekAgo);

  const apiUsageOrgsToday = new Set(apiUsageRowsToday.map((r) => r.org_id).filter(Boolean)).size;
  const apiUsageOrgsWeek = new Set(apiUsageRowsWeek.map((r) => r.org_id).filter(Boolean)).size;
  const apiUsageOrgsMonth = new Set(apiUsageRows.map((r) => r.org_id).filter(Boolean)).size;
  const apiUsageCallsToday = apiUsageRowsToday.length;
  const apiUsageCallsWeek = apiUsageRowsWeek.length;
  const apiUsageCallsMonth = apiUsageRows.length;
  const apiUsageLastCallAt = apiUsageRows[0]?.created_at ?? null; // rows sorted newest-first

  // Rough tool guess from the raw User-Agent header — a simple substring
  // match, not a real UA parser. This is the actual answer to "what's
  // calling the API," to the extent a UA string reveals it: Zapier/Make/
  // Postman/curl/etc. mostly send identifiable UAs, but a native CRM's
  // outbound-webhook action (e.g. a HubSpot workflow) often sends a generic
  // HTTP client UA instead of announcing "HubSpot" — this narrows it, it
  // doesn't guarantee an exact tool name every time.
  function guessTool(userAgent: string | null): string {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("zapier")) return "Zapier";
    if (ua.includes("make.com") || ua.includes("integromat")) return "Make";
    if (ua.includes("hubspot")) return "HubSpot";
    if (ua.includes("postman")) return "Postman";
    if (ua.includes("curl")) return "curl";
    if (ua.includes("python")) return "Python";
    if (ua.includes("node") || ua.includes("axios")) return "Node.js";
    return "other/unrecognized";
  }

  const apiUsageToolTallyMonth: Record<string, number> = {};
  for (const r of apiUsageRows) {
    const tool = guessTool(r.user_agent);
    apiUsageToolTallyMonth[tool] = (apiUsageToolTallyMonth[tool] ?? 0) + 1;
  }

  // Org names for the per-org breakdown below — a separate lookup since
  // api_usage only stores org_id.
  const orgIdsThisMonth = Array.from(new Set(apiUsageRows.map((r) => r.org_id).filter((id): id is string => !!id)));
  const orgNameById = new Map<string, string>();
  if (orgIdsThisMonth.length > 0) {
    const { data: orgNameRows, error: orgNameError } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", orgIdsThisMonth);
    if (orgNameError) {
      console.error("Admin digest cron: api_usage org name lookup failed", orgNameError);
    }
    for (const o of orgNameRows || []) orgNameById.set(o.id, o.name ?? "(unnamed org)");
  }

  // "New integrators today" (direct ask: "a someone just started
  // integrating would be good to know") — an org counts as new if its
  // first-ever api_usage row (across ALL time, not just this month) falls
  // within today's window. Checked via a second query bounded to just
  // today's orgs (cheap, indexed by org_id) rather than scanning the whole
  // table's history. Known first-run caveat, not a bug: every org will
  // look "new" for the first day or two after this ships, since there's no
  // prior history yet for anyone to compare against — self-corrects as
  // api_usage accumulates real history.
  const orgIdsToday = Array.from(new Set(apiUsageRowsToday.map((r) => r.org_id).filter((id): id is string => !!id)));
  const newIntegratorOrgIds = new Set<string>();
  if (orgIdsToday.length > 0) {
    const { data: priorRows, error: priorError } = await admin
      .from("api_usage")
      .select("org_id")
      .in("org_id", orgIdsToday)
      .lt("created_at", dayAgoDate);
    if (priorError) {
      console.error("Admin digest cron: api_usage prior-history lookup failed", priorError);
    }
    const orgIdsWithPriorHistory = new Set((priorRows || []).map((r) => r.org_id));
    for (const id of orgIdsToday) {
      if (!orgIdsWithPriorHistory.has(id)) newIntegratorOrgIds.add(id);
    }
  }

  // Per-org breakdown for the month — org name + call count + most recent
  // call + guessed tool from that most recent call's UA. Rows are already
  // sorted newest-first, so the first row seen per org is its most recent
  // call.
  type ApiUsageOrgSummary = { orgId: string; orgName: string; calls: number; lastCallAt: string; tool: string };
  const apiUsageByOrg = new Map<string, ApiUsageOrgSummary>();
  for (const r of apiUsageRows) {
    if (!r.org_id) continue;
    const existing = apiUsageByOrg.get(r.org_id);
    if (!existing) {
      apiUsageByOrg.set(r.org_id, {
        orgId: r.org_id,
        orgName: orgNameById.get(r.org_id) ?? "(unknown org)",
        calls: 1,
        lastCallAt: r.created_at,
        tool: guessTool(r.user_agent),
      });
    } else {
      existing.calls++;
    }
  }
  const apiUsageOrgSummaries = Array.from(apiUsageByOrg.values())
    .sort((a, b) => b.calls - a.calls)
    .map((o) => ({
      orgName: o.orgName,
      calls: o.calls,
      lastCallAt: o.lastCallAt,
      tool: o.tool,
      isNew: newIntegratorOrgIds.has(o.orgId),
    }));
  const apiUsageNewIntegratorsCount = newIntegratorOrgIds.size;

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
      templateCapHitsMonth,
      packsSoldMonth,
      packsRevenueMonth,
      outstandingCredits,
      disposableBlocksToday: disposableBlocksToday ?? 0,
      disposableBlocksWeek: disposableBlocksWeek ?? 0,
      disposableBlocksMonth: disposableBlocksMonth ?? 0,
      tsaTallyWeek,
      tsaTallyMonth,
      capiReddit,
      capiLinkedin,
      capiLastError,
      apiUsageOrgsToday,
      apiUsageOrgsWeek,
      apiUsageOrgsMonth,
      apiUsageCallsToday,
      apiUsageCallsWeek,
      apiUsageCallsMonth,
      apiUsageLastCallAt,
      apiUsageNewIntegratorsCount,
      apiUsageToolTallyMonth,
      apiUsageOrgSummaries,
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
    templateCapHitsMonth,
    packsSoldMonth,
    packsRevenueMonth,
    outstandingCredits,
    disposableBlocksToday: disposableBlocksToday ?? 0,
    disposableBlocksWeek: disposableBlocksWeek ?? 0,
    disposableBlocksMonth: disposableBlocksMonth ?? 0,
    tsaTallyWeek,
    tsaTallyMonth,
    capiReddit,
    capiLinkedin,
    capiLastError,
    apiUsageOrgsToday,
    apiUsageOrgsWeek,
    apiUsageOrgsMonth,
    apiUsageCallsToday,
    apiUsageCallsWeek,
    apiUsageCallsMonth,
    apiUsageLastCallAt,
    apiUsageNewIntegratorsCount,
    apiUsageToolTallyMonth,
    apiUsageOrgSummaries,
  });
}
