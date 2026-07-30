import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { sendReminderEmail } from "@/lib/email";
import { planHasFeature } from "@/lib/plan";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; signerId: string }> }) {
  const { id, signerId } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: doc } = await supabase.from("documents").select("id, org_id, title, status").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.status !== "sent") {
    return NextResponse.json({ error: "This document isn't currently out for signature." }, { status: 400 });
  }

  const { data: signer } = await supabase
    .from("signers")
    .select("id, document_id, name, email, status, signing_token")
    .eq("id", signerId)
    .single();
  if (!signer || signer.document_id !== id) {
    return NextResponse.json({ error: "Signer not found" }, { status: 404 });
  }
  if (signer.status !== "sent" && signer.status !== "viewed") {
    return NextResponse.json({ error: "This signer hasn't been notified yet, or has already responded." }, { status: 400 });
  }

  const { data: org } = await supabase.from("organizations").select("name, plan").eq("id", orgId).single();
  if (!planHasFeature(org?.plan, "reminders")) {
    return NextResponse.json(
      { error: "Reminders are a Pro plan feature. Upgrade to send reminders.", upgrade: true },
      { status: 402 }
    );
  }
  const senderName = org?.name || user.email || "Someone";

  let emailId: string | null = null;
  let emailError: unknown = null;
  try {
    const result = await sendReminderEmail({
      to: signer.email,
      signerName: signer.name,
      senderName,
      documentTitle: doc.title,
      signingToken: signer.signing_token,
    });
    emailId = result.id;
    emailError = result.error;
  } catch (err) {
    console.error("Reminder email failed", err);
    return NextResponse.json({ error: "Couldn't send the reminder — try again." }, { status: 500 });
  }

  await supabase
    .from("signers")
    .update({
      last_reminder_at: new Date().toISOString(),
      last_email_id: emailId,
      last_email_event: emailError ? "send_failed" : "sent",
      last_email_event_at: new Date().toISOString(),
    })
    .eq("id", signerId);

  return NextResponse.json({ success: true });
}
