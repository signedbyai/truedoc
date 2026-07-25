import { NextResponse } from "next/server";
import { getSignerByToken, fetchSignerSpeedStat, requireVerifiedSigner } from "@/lib/signing";
import { sendSignerInviteEmail, sendCompletionEmail, sendSignerDocGateEmail, appUrl } from "@/lib/email";
import { generateSignedPdf } from "@/lib/generate-signed-pdf";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { computeSigningOutcome } from "@/lib/signing-routing";
import { visibleFieldsForSigner } from "@/lib/field-visibility";
import { bodySchema } from "./schema";

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
  const authGate = requireVerifiedSigner(signer);
  if (authGate) return authGate;

  if (signer.status === "signed") {
    // Idempotent replay. A signer whose submit succeeded server-side but
    // lost the response on the way back (flaky connection) will retry — and
    // previously got a scary "You've already signed this document" error at
    // the single worst moment in the product. Instead, return the same
    // success outcome their original submission would have: they're signed,
    // so show them the Signed screen. `document.status` is re-read on every
    // request, so it reflects completion caused by that earlier submit.
    const speedStat = await fetchSignerSpeedStat(admin, signer.id);
    return NextResponse.json({
      success: true,
      completed: document.status === "completed",
      speedStat,
      alreadySigned: true,
    });
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
    .select("id, required, signer_id, type, template_role")
    .eq("document_id", document.id);

  const { count: signerCount } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", document.id);

  const myFields = visibleFieldsForSigner(allFields || [], signer.id, signerCount ?? 0);

  const missing = myFields.filter((f) => f.required && !parsed.data.values[f.id]?.trim());
  if (missing.length > 0) {
    const labels = Array.from(new Set(missing.map((f) => f.type)));
    return NextResponse.json(
      {
        error: `Please fill in the highlighted field${missing.length > 1 ? "s" : ""} (${labels.join(", ")}) before signing.`,
        missingFieldIds: missing.map((f) => f.id),
      },
      { status: 400 }
    );
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

  // Personal "you signed this in X seconds" stat for the completion screen
  // -- see supabase/migrations/0018_signer_speed_stat.sql for why this
  // works regardless of the sending org's plan, and src/lib/speed-stat.ts
  // for the plausibility/sample-size gating applied here. Best-effort: a
  // signer's ability to finish signing must never depend on this succeeding.
  const speedStat = await fetchSignerSpeedStat(admin, signer.id);

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
    .select("id, name, email, order_index, status, signing_token, docgate_code")
    .eq("document_id", document.id)
    .order("order_index", { ascending: true });

  const outcome = computeSigningOutcome(allSigners || [], signer.id);
  const documentCompleted = outcome.documentCompleted;

  if (outcome.documentCompleted) {
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

    // DocGate (Business tier — see src/lib/plan.ts): only fires if the
    // sender actually set a gate link on this document. The signer whose
    // own submission just completed the document (the one currently
    // running this request) gets the link immediately on their own
    // confirmation screen instead (signing-view.tsx) — everyone else on
    // this document finished earlier and never saw it, so this is their
    // only notification. No plan check here: the setup UI/API already only
    // let a Business-plan sender set docgate_url in the first place, and a
    // downgrade after sending shouldn't un-send an email that's about to go
    // out to someone who already signed.
    if (document.docgate_url) {
      const otherSigners = (allSigners || []).filter((s) => s.id !== signer.id);
      for (const s of otherSigners) {
        await sendSignerDocGateEmail({
          to: s.email,
          signerName: s.name,
          documentTitle: doc?.title || document.title,
          gateLink: `${appUrl()}/g/${s.docgate_code}`,
          docgateLabel: document.docgate_label,
        }).catch((err) => console.error("DocGate email failed", err));
      }
    }
  } else if (outcome.nextUpSignerIds.length > 0) {
    const nextUp = (allSigners || []).filter((s) => outcome.nextUpSignerIds.includes(s.id));
    const { data: org } = await admin
      .from("documents")
      .select("org_id, title, recipient_notice, invite_subject, invite_message, organizations(name)")
      .eq("id", document.id)
      .single();
    const senderName = (org as unknown as { organizations?: { name?: string } })?.organizations?.name || "Someone";

    for (const nextSigner of nextUp) {
      await sendSignerInviteEmail({
        to: nextSigner.email,
        signerName: nextSigner.name,
        senderName,
        documentTitle: org?.title || document.title,
        signingToken: nextSigner.signing_token,
        // Same notice every recipient on this document gets — set once at
        // the initial send (see api/documents/[id]/send), not re-decided
        // per signer.
        recipientNotice: org?.recipient_notice,
        inviteSubject: org?.invite_subject,
        inviteMessage: org?.invite_message,
      }).catch((err) => console.error("Invite email failed", err));
    }

    await admin
      .from("signers")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .in(
        "id",
        nextUp.map((s) => s.id)
      );
  }

  return NextResponse.json({ success: true, completed: documentCompleted, speedStat });
}
