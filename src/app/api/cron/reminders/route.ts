import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail, sendDocumentExpiredEmail } from "@/lib/email";
import { planHasFeature } from "@/lib/plan";

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
    | {
        id: string;
        title: string;
        status: string;
        organizations: { name: string | null; plan: string | null } | { name: string | null; plan: string | null }[] | null;
      }
    | {
        id: string;
        title: string;
        status: string;
        organizations: { name: string | null; plan: string | null } | { name: string | null; plan: string | null }[] | null;
      }[]
    | null;
};

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Flips "sent" documents whose expires_at has passed into the 'expired'
// terminal status, and lets the owner know. Runs BEFORE the reminder pass
// in GET below so a document that just expired this same run doesn't also
// get a reminder sent out for it in the same invocation — the reminder
// pass re-selects fresh document status after this has already updated it.
async function expireOverdueDocuments(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data: overdue, error } = await admin
    .from("documents")
    .select("id, owner_id, title")
    .eq("status", "sent")
    .not("expires_at", "is", null)
    .lte("expires_at", new Date().toISOString())
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("Reminder cron: expiration fetch failed", error);
    return 0;
  }

  let expiredCount = 0;
  for (const doc of overdue || []) {
    const { error: updateError } = await admin.from("documents").update({ status: "expired" }).eq("id", doc.id);
    if (updateError) {
      console.error("Reminder cron: failed to expire document", doc.id, updateError);
      continue;
    }
    await admin.from("audit_events").insert({ document_id: doc.id, event_type: "expired" });
    expiredCount++;

    try {
      const { data: ownerData } = await admin.auth.admin.getUserById(doc.owner_id);
      const ownerEmail = ownerData?.user?.email;
      if (ownerEmail) {
        await sendDocumentExpiredEmail({ to: ownerEmail, documentTitle: doc.title, documentId: doc.id });
      }
    } catch (err) {
      console.error("Reminder cron: expired-notice email failed for document", doc.id, err);
    }
  }

  return expiredCount;
}

// Daily Vercel Cron job (see vercel.json). Nudges signers who've been sitting
// on a "sent"/"viewed" status for 3+ days since their last email (initial
// invite or previous reminder), stopping once they sign, decline, or the
// document is voided. Also sweeps documents past their optional expires_at
// (documents.expires_at, migration 0030) into the 'expired' terminal status
// before the reminder pass below runs — same daily trigger, no separate cron.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const expiredCount = await expireOverdueDocuments(admin);

  const { data, error } = await admin
    .from("signers")
    .select(
      "id, name, email, signing_token, sent_at, last_reminder_at, documents(id, title, status, organizations(name, plan))"
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
    if (!planHasFeature(org?.plan, "reminders")) continue; // not entitled to automatic reminders
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

  return NextResponse.json({ remindedCount, expiredCount });
}
