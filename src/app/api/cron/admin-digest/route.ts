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
      totalUsers,
      freeOrgs,
      paidOrgs,
    });
  } catch (err) {
    console.error("Admin digest cron: send failed", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({ loggedInToday, loggedInWeek, loggedInMonth, totalUsers, freeOrgs, paidOrgs });
}
