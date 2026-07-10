import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email";

const REMINDER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // nudge every 3 days until signed, declined, or voided
const MAX_PER_RUN = 200; // defensive cap so one invocation can't balloon

type SignerRow = {
  id: string;
  name: string | null;
  email: string;
  signing_token: string;
  sent_at: string | null;
  last_reminder_at: string | null;
  documents:
    | { id: string; title: string; status: string; organizations: { name: string | null } | { name: string | null }[] | null }
    | { id: string; title: string; status: string; organizations: { name: string | null } | { name: string | null }[] | null }[]
    | null;
};

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Daily Vercel Cron job (see vercel.json). Nudges signers who've been sitting
// on a "sent"/"viewed" status for 3+ days since their last email (initial
// invite or previous reminder), stopping once they sign, decline, or the
// document is voided.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("signers")
    .select(
      "id, name, email, signing_token, sent_at, last_reminder_at, documents(id, title, status, organizations(name))"
    )
    .in("status", ["sent", "viewed"])
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("Reminder cron: fetch failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as unknown as SignerRow[];
  const now = Date.now();
  let remindedCount = 0;

  for (const row of rows) {
    const doc = firstOf(row.documents);
    if (!doc || doc.status !== "sent") continue; // signed/declined/voided elsewhere, or data inconsistency

    const lastContact = row.last_reminder_at ?? row.sent_at;
    if (!lastContact) continue; // no record of when they were first notified — don't guess

    if (now - new Date(lastContact).getTime() < REMINDER_INTERVAL_MS) continue;

    const org = firstOf(doc.organizations);
    const senderName = org?.name || "Someone";

    try {
      await sendReminderEmail({
        to: row.email,
        signerName: row.name,
        senderName,
        documentTitle: doc.title,
        signingToken: row.signing_token,
      });
      await admin.from("signers").update({ last_reminder_at: new Date().toISOString() }).eq("id", row.id);
      remindedCount++;
    } catch (err) {
      console.error("Reminder cron: send failed for signer", row.id, err);
    }
  }

  return NextResponse.json({ remindedCount });
}
