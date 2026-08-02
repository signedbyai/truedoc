import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { sendSignerInviteEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";
import { checkSingleSignerRoleCount } from "@/lib/console-actions";

const recipientSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().toLowerCase().email(),
});

// Capped well above any realistic small-business batch — keeps a single
// request from fanning out into hundreds of emails/R2 writes/DB rows.
const bodySchema = z.object({ recipients: z.array(recipientSchema).min(1).max(200) });

type TemplateFieldMapEntry = {
  type: "signature" | "initials" | "date" | "text" | "checkbox";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  role: number | null;
};

// Sends the same template to many recipients at once — each gets their own
// independent document with a single signer (themselves), auto-sent
// immediately. This is the Team+ "bulk send" feature; unlike @use/route.ts
// (which seeds one draft for manual editing), this both creates AND sends.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("name, plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "bulkSend")) {
    return NextResponse.json({ error: "Bulk send requires the Team plan or higher.", upgrade: true }, { status: 402 });
  }

  const rateOk = await checkRateLimit(`bulk-send:${orgId}`, 10, 3600);
  if (!rateOk) {
    return NextResponse.json({ error: "Too many bulk sends. Try again later." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Please provide a valid recipient list." }, { status: 400 });

  const { data: template } = await supabase
    .from("templates")
    .select(
      "id, org_id, name, base_file_path, page_count, field_map, payment_link_url, payment_label, docgate_url, docgate_label"
    )
    .eq("id", id)
    .single();
  if (!template || template.org_id !== orgId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  const fieldMap = (template.field_map as TemplateFieldMapEntry[]) || [];
  if (fieldMap.length === 0) {
    return NextResponse.json({ error: "This template has no fields placed yet." }, { status: 400 });
  }
  // Every recipient below gets their own document with a single signer
  // (themselves) — a template built for 2+ parties has no home for the
  // other parties' fields on a bulk send. Block the whole batch up front
  // instead of silently dropping those fields (2026-08-02 bug: signer_id
  // was left null and never resolved, so nobody signing via bulk send ever
  // saw any fields at all, single- or multi-party template alike). See
  // checkSingleSignerRoleCount's doc comment.
  const roleCheck = checkSingleSignerRoleCount(fieldMap);
  if (!roleCheck.ok) {
    return NextResponse.json(
      {
        error: `This template has fields for ${roleCheck.roleCount} different signers. Bulk send only supports single-signer templates — use "Use template" from the document instead.`,
      },
      { status: 400 }
    );
  }

  const senderName = org.name || user.email || "Someone";
  const createdDocumentIds: string[] = [];
  // Each recipient here gets its own document created and sent immediately —
  // unlike the single-document editor flow, there's no draft state to pause
  // on, so this is a warn-after-the-fact list rather than a pre-send
  // confirmation modal (see BOUNCE_TRACKING_SCOPE.md).
  const domainWarnings: string[] = [];

  for (const recipient of parsed.data.recipients) {
    const domainCheck = await checkEmailDomainHasMx(recipient.email);
    if (!domainCheck.ok) domainWarnings.push(domainCheck.reason);

    const documentId = crypto.randomUUID();
    const title = template.name;

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        org_id: orgId,
        owner_id: user.id,
        title,
        status: "sent",
        file_path: template.base_file_path,
        original_filename: `${title}.pdf`,
        page_count: template.page_count,
        payment_link_url: template.payment_link_url,
        payment_label: template.payment_label,
        docgate_url: template.docgate_url,
        docgate_label: template.docgate_label,
      })
      .select("id")
      .single();
    if (docError || !doc) {
      console.error("Bulk send: create document failed", docError);
      continue;
    }

    const { data: signer, error: signerError } = await supabase
      .from("signers")
      .insert({
        document_id: doc.id,
        email: recipient.email,
        name: recipient.name || null,
        order_index: 0,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("id, signing_token")
      .single();
    if (signerError || !signer) {
      console.error("Bulk send: create signer failed", signerError);
      continue;
    }

    // roleCheck above guarantees at most one distinct role across
    // fieldMap, so every field belongs to this recipient's own signer row
    // — resolve it directly rather than leaving signer_id null (that used
    // to rely on a fallback in field-visibility.ts that never actually
    // fired, since template_role was always set — see
    // checkSingleSignerRoleCount's doc comment).
    const rows = fieldMap.map((f) => ({
      document_id: doc.id,
      signer_id: signer.id,
      template_role: null,
      type: f.type,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      required: f.required,
    }));
    const { error: fieldsError } = await supabase.from("document_fields").insert(rows);
    if (fieldsError) {
      console.error("Bulk send: insert fields failed", fieldsError);
      // Don't send an invite for a document that ended up with no fields —
      // matches the docError/signerError skip pattern above rather than
      // continuing to email a signer nothing was ever placed for.
      continue;
    }

    await supabase.from("audit_events").insert([
      { document_id: doc.id, event_type: "created", metadata: { from_template: template.id, bulk_send: true } },
      { document_id: doc.id, event_type: "sent", metadata: { sent_by: user.id, bulk_send: true } },
    ]);

    try {
      const { id: emailId, error: emailError } = await sendSignerInviteEmail({
        to: recipient.email,
        signerName: recipient.name || null,
        senderName,
        documentTitle: title,
        signingToken: signer.signing_token,
      });
      await supabase
        .from("signers")
        .update({
          last_email_id: emailId,
          last_email_event: emailError ? "send_failed" : "sent",
          last_email_event_at: new Date().toISOString(),
        })
        .eq("id", signer.id);
    } catch (err) {
      console.error("Bulk send: invite email failed", err);
    }

    createdDocumentIds.push(doc.id);
  }

  if (createdDocumentIds.length === 0) {
    return NextResponse.json({ error: "Couldn't create any documents. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    count: createdDocumentIds.length,
    documentIds: createdDocumentIds,
    ...(domainWarnings.length > 0 ? { domainWarnings } : {}),
  });
}
