import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { sendSignerInviteEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";

const bodySchema = z.object({
  template_id: z.string().uuid(),
  signer: z.object({
    name: z.string().trim().max(200).optional().nullable(),
    email: z.string().trim().toLowerCase().email(),
  }),
});

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

// Business-tier public API: create a document from a template and send it
// to one signer in a single call. No Supabase session exists here — the
// caller authenticates via an org API key (see src/lib/api-auth.ts) — so
// this always goes through the service-role admin client, same pattern as
// the token-based signer-facing routes.
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { orgId, orgName } = auth;

  const rateOk = await checkRateLimit(`api-v1-documents:${orgId}`, 60, 3600);
  if (!rateOk) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("owner_id").eq("id", orgId).single();
  const { data: template } = await admin
    .from("templates")
    .select(
      "id, org_id, name, base_file_path, page_count, field_map, payment_link_url, payment_label, docgate_url, docgate_label"
    )
    .eq("id", parsed.data.template_id)
    .single();

  if (!org || !template || template.org_id !== orgId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  const fieldMap = (template.field_map as TemplateFieldMapEntry[]) || [];
  if (fieldMap.length === 0) {
    return NextResponse.json({ error: "This template has no fields placed yet." }, { status: 400 });
  }

  const documentId = crypto.randomUUID();
  const { data: doc, error: docError } = await admin
    .from("documents")
    .insert({
      id: documentId,
      org_id: orgId,
      owner_id: org.owner_id,
      title: template.name,
      status: "sent",
      file_path: template.base_file_path,
      original_filename: `${template.name}.pdf`,
      page_count: template.page_count,
      payment_link_url: template.payment_link_url,
      payment_label: template.payment_label,
      docgate_url: template.docgate_url,
      docgate_label: template.docgate_label,
    })
    .select("id, status")
    .single();
  if (docError || !doc) {
    console.error("API v1: create document failed", docError);
    return NextResponse.json({ error: "Couldn't create the document." }, { status: 500 });
  }

  const { data: signer, error: signerError } = await admin
    .from("signers")
    .insert({
      document_id: doc.id,
      email: parsed.data.signer.email,
      name: parsed.data.signer.name || null,
      order_index: 0,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .select("id, signing_token")
    .single();
  if (signerError || !signer) {
    console.error("API v1: create signer failed", signerError);
    return NextResponse.json({ error: "Couldn't add the signer." }, { status: 500 });
  }

  const rows = fieldMap.map((f) => ({
    document_id: doc.id,
    signer_id: null,
    template_role: f.role,
    type: f.type,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    required: f.required,
  }));
  await admin.from("document_fields").insert(rows);

  await admin.from("audit_events").insert([
    { document_id: doc.id, event_type: "created", metadata: { from_template: template.id, via_api: true } },
    { document_id: doc.id, event_type: "sent", metadata: { via_api: true } },
  ]);

  // Informational only, never blocking — this is a synchronous API call with
  // no one present to confirm "send anyway" the way the dashboard's editor
  // can, so an invalid-looking domain still gets sent; the caller sees it in
  // the response and can act on it themselves. See BOUNCE_TRACKING_SCOPE.md.
  const domainCheck = await checkEmailDomainHasMx(parsed.data.signer.email);

  try {
    const { id: emailId, error: emailError } = await sendSignerInviteEmail({
      to: parsed.data.signer.email,
      signerName: parsed.data.signer.name || null,
      senderName: orgName,
      documentTitle: template.name,
      signingToken: signer.signing_token,
    });
    await admin
      .from("signers")
      .update({
        last_email_id: emailId,
        last_email_event: emailError ? "send_failed" : "sent",
        last_email_event_at: new Date().toISOString(),
      })
      .eq("id", signer.id);
  } catch (err) {
    console.error("API v1: invite email failed", err);
  }

  return NextResponse.json(
    { id: doc.id, status: doc.status, ...(domainCheck.ok ? {} : { domain_warning: domainCheck.reason }) },
    { status: 201 }
  );
}
