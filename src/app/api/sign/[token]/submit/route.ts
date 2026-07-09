import { NextResponse } from "next/server";
import { z } from "zod";
import { getSignerByToken } from "@/lib/signing";
import { sendSignerInviteEmail, sendCompletionEmail } from "@/lib/email";
import { generateSignedPdf } from "@/lib/generate-signed-pdf";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  consent: z.literal(true),
  values: z.record(z.string().uuid(), z.string()),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Generous — real signers can retry a few times after a validation error —
  // but caps scripted hammering of a single signing link.
  const allowed = await checkRateLimit(`sign-submit:${getClientIp(request)}`, 20, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;

  if (signer.status === "signed") {
    return NextResponse.json({ error: "You've already signed this document." }, { status: 400 });
  }
  if (signer.status === "declined") {
    return NextResponse.json({ error: "This signing request was declined." }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please give consent and fill in all required fields." }, { status: 400 });
  }

  const { data: allFields } = await admin
    .from("document_fields")
    .select("id, required, signer_id")
    .eq("document_id", document.id);

  const { count: signerCount } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", document.id);

  const myFields = (allFields || []).filter(
    (f) => f.signer_id === signer.id || (f.signer_id === null && signerCount === 1)
  );

  const missing = myFields.filter((f) => f.required && !parsed.data.values[f.id]?.trim());
  if (missing.length > 0) {
    return NextResponse.json({ error: "Please fill in all required fields before signing." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");

  // Save only values for fields this signer is actually allowed to touch.
  const myFieldIds = new Set(myFields.map((f) => f.id));
  for (const [fieldId, value] of Object.entries(parsed.data.values)) {
    if (!myFieldIds.has(fieldId)) continue;
    await admin.from("document_fields").update({ value }).eq("id", fieldId);
  }

  await admin.from("signers").update({ status: "signed", signed_at: new Date().toISOString() }).eq("id", signer.id);

  await admin.from("audit_events").insert([
    {
      document_id: document.id,
      signer_id: signer.id,
      event_type: "consent_given",
      ip_address: ip,
      user_agent: userAgent,
    },
    {
      document_id: document.id,
      signer_id: signer.id,
      event_type: "signed",
      ip_address: ip,
      user_agent: userAgent,
    },
  ]);

  // Figure out what's next: advance to the next routing tier, or complete.
  const { data: allSigners } = await admin
    .from("signers")
    .select("id, name, email, order_index, status, signing_token")
    .eq("document_id", document.id)
    .order("order_index", { ascending: true });

  const stillPending = (allSigners || []).filter((s) => s.id !== signer.id && s.status !== "signed");
  const documentCompleted = stillPending.length === 0;

  if (documentCompleted) {
    await admin.from("documents").update({ status: "completed" }).eq("id", document.id);
    const { data: completedEvent } = await admin
      .from("audit_events")
      .insert({ document_id: document.id, event_type: "completed" })
      .select("id")
      .single();

    try {
      const { hash } = await generateSignedPdf(document.id);
      if (completedEvent) {
        await admin.from("audit_events").update({ document_hash: hash }).eq("id", completedEvent.id);
      }
    } catch (err) {
      // Don't block completion on PDF generation — the doc is still legally
      // signed via the audit trail; the file can be regenerated later.
      console.error("Signed PDF generation failed", err);
    }

    const { data: doc } = await admin.from("documents").select("owner_id, title").eq("id", document.id).single();
    if (doc) {
      const { data: ownerData } = await admin.auth.admin.getUserById(doc.owner_id);
      const ownerEmail = ownerData?.user?.email;
      if (ownerEmail) {
        await sendCompletionEmail({ to: ownerEmail, documentTitle: doc.title, documentId: document.id }).catch((err) =>
          console.error("Completion email failed", err)
        );
      }
    }
  } else {
    const currentTier = signer.order_index;
    const currentTierStillPending = stillPending.some((s) => s.order_index === currentTier);
    const futureTiers = stillPending.filter((s) => s.order_index > currentTier);

    if (!currentTierStillPending && futureTiers.length > 0) {
      const nextTier = Math.min(...futureTiers.map((s) => s.order_index));
      const nextUp = futureTiers.filter((s) => s.order_index === nextTier && s.status === "pending");
      if (nextUp.length > 0) {
        const { data: org } = await admin
          .from("documents")
          .select("org_id, title, organizations(name)")
          .eq("id", document.id)
          .single();
        const senderName =
          (org as unknown as { organizations?: { name?: string } })?.organizations?.name || "Someone";

        for (const nextSigner of nextUp) {
          await sendSignerInviteEmail({
            to: nextSigner.email,
            signerName: nextSigner.name,
            senderName,
            documentTitle: org?.title || document.title,
            signingToken: nextSigner.signing_token,
          }).catch((err) => console.error("Invite email failed", err));
        }

        await admin
          .from("signers")
          .update({ status: "sent" })
          .in(
            "id",
            nextUp.map((s) => s.id)
          );
      }
    }
  }

  return NextResponse.json({ success: true, completed: documentCompleted });
}
