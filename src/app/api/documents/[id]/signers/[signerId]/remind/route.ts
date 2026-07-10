import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { sendReminderEmail } from "@/lib/email";

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

  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();
  const senderName = org?.name || user.email || "Someone";

  try {
    await sendReminderEmail({
      to: signer.email,
      signerName: signer.name,
      senderName,
      documentTitle: doc.title,
      signingToken: signer.signing_token,
    });
  } catch (err) {
    console.error("Reminder email failed", err);
    return NextResponse.json({ error: "Couldn't send the reminder — try again." }, { status: 500 });
  }

  await supabase.from("signers").update({ last_reminder_at: new Date().toISOString() }).eq("id", signerId);

  return NextResponse.json({ success: true });
}
