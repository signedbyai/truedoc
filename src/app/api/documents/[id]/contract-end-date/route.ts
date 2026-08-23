import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndOrg } from "@/lib/org";
import { bodySchema } from "./schema";

// Sets (or clears) documents.contract_end_date (migration 0060) -- free on
// every plan, any tier, no plan check. Distinct from expires_at's route:
// this never touches document status, and can be set/edited regardless of
// status (most useful on a completed document, but not restricted to it).
// Enforced by the reminders cron's remindUpcomingContractEndDates()
// (src/app/api/cron/reminders/route.ts), which sends two lead-time emails
// (1 month out, 1 week out) rather than flipping any status.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid date, or leave it blank." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("id, org_id").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Clearing both reminder-sent markers on every save (not just when the
  // date actually changes -- cheap and simpler than diffing) means an
  // edited date always gets a fresh reminder cycle instead of silently
  // skipping a stage the cron technically "already sent" against the old
  // date.
  const { error } = await supabase
    .from("documents")
    .update({
      contract_end_date: parsed.data.contract_end_date || null,
      contract_end_date_reminder_30_sent_at: null,
      contract_end_date_reminder_7_sent_at: null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
