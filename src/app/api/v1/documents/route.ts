import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { sendSignerInviteEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";

const legacySignerSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().toLowerCase().email(),
});

// Multi-party signer, keyed to the same role numbers already on
// template.field_map (role 0 = "Party 1", role 1 = "Party 2", ... — see
// field-editor.tsx's Field.templateRole / addDetectedSigners, the
// client-side role-matching this ports server-side). See
// CRM_MCP_READINESS_PHASE1_SCOPE.md Part A#4.
const roleSignerSchema = z.object({
  role: z.number().int().min(0).max(19),
  name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().toLowerCase().email(),
});

const bodySchema = z
  .object({
    template_id: z.string().uuid(),
    // Exactly one of these two shapes. `signer` is the original
    // single-recipient path (kept byte-for-byte behaviorally unchanged for
    // existing integrations). `signers` is the new multi-party path.
    signer: legacySignerSchema.optional(),
    signers: z.array(roleSignerSchema).min(1).max(20).optional(),
  })
  .refine((data) => Boolean(data.signer) !== Boolean(data.signers), {
    message:
      "Provide either 'signer' (single recipient) or 'signers' (multi-party, each with a 'role' number), not both.",
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

const LIST_STATUS_OPTIONS = ["draft", "sent", "completed", "declined", "voided"] as const;
const LIST_PAGE_SIZE_DEFAULT = 20;
const LIST_PAGE_SIZE_MAX = 100;

// GET /api/v1/documents — list/search the org's documents
// (CRM_MCP_READINESS_PHASE1_SCOPE.md Part A#1). Lets a Make/CRM scenario poll
// "what's changed" or let a user browse existing documents from inside a
// dropdown, instead of only ever tracking an id it stored at creation time.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (LIST_STATUS_OPTIONS as readonly string[]).includes(statusParam) ? statusParam : null;
  const limit = Math.min(
    LIST_PAGE_SIZE_MAX,
    Math.max(1, parseInt(url.searchParams.get("limit") || "", 10) || LIST_PAGE_SIZE_DEFAULT)
  );
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "", 10) || 0);

  const admin = createAdminClient();
  let query = admin
    .from("documents")
    .select("id, title, status, created_at, updated_at", { count: "exact" })
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    console.error("API v1: list documents failed", error);
    return NextResponse.json({ error: "Couldn't list documents." }, { status: 500 });
  }

  return NextResponse.json({
    documents: data || [],
    total: count ?? null,
    limit,
    offset,
    has_more: count !== null ? offset + (data?.length || 0) < count : (data?.length || 0) === limit,
  });
}

// Business-tier public API: create a document from a template and send it to
// one signer (`signer`) or multiple role-tagged signers (`signers`) in a
// single call. No Supabase session exists here — the caller authenticates
// via an org API key (see src/lib/api-auth.ts) — so this always goes through
// the service-role admin client, same pattern as the token-based
// signer-facing routes.
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

  // Multi-party path validation up front, before anything is created: every
  // role actually used in the template's field layout must have a matching
  // signer in the request, or that party's fields would be created
  // unassigned and invisible to everyone (see field-visibility.ts) — the
  // same integrity rule documents/[id]/send/route.ts enforces for the
  // dashboard flow ("every recipient needs at least one field"), applied
  // here in the other direction ("every role needs a recipient").
  if (parsed.data.signers) {
    const requestedRoles = new Set(parsed.data.signers.map((s) => s.role));
    if (requestedRoles.size !== parsed.data.signers.length) {
      return NextResponse.json({ error: "Each signer must have a distinct 'role' number." }, { status: 400 });
    }
    const fieldRoles = new Set(fieldMap.map((f) => f.role).filter((r): r is number => r !== null));
    const missingRoles = Array.from(fieldRoles).filter((r) => !requestedRoles.has(r));
    if (missingRoles.length > 0) {
      const partyLabels = missingRoles
        .sort((a, b) => a - b)
        .map((r) => `Party ${r + 1} (role ${r})`)
        .join(", ");
      return NextResponse.json(
        { error: `This template needs a signer for: ${partyLabels}.` },
        { status: 400 }
      );
    }
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

  if (parsed.data.signers) {
    // --- Multi-party path -------------------------------------------------
    const requested = parsed.data.signers;

    const { data: createdSigners, error: signersError } = await admin
      .from("signers")
      .insert(
        requested.map((s) => ({
          document_id: doc.id,
          email: s.email,
          name: s.name || null,
          order_index: s.role,
        }))
      )
      .select("id, email, name, order_index, signing_token");
    if (signersError || !createdSigners) {
      console.error("API v1: create signers failed", signersError);
      return NextResponse.json({ error: "Couldn't add the signers." }, { status: 500 });
    }

    const roleToSignerId = new Map(createdSigners.map((s) => [s.order_index, s.id]));
    const rows = fieldMap.map((f) => {
      const matchedSignerId = f.role !== null ? roleToSignerId.get(f.role) ?? null : null;
      return {
        document_id: doc.id,
        signer_id: matchedSignerId,
        template_role: matchedSignerId !== null ? null : f.role,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
      };
    });
    await admin.from("document_fields").insert(rows);

    await admin.from("audit_events").insert([
      { document_id: doc.id, event_type: "created", metadata: { from_template: template.id, via_api: true, multi_party: true, signer_count: createdSigners.length } },
      { document_id: doc.id, event_type: "sent", metadata: { via_api: true, multi_party: true, signer_count: createdSigners.length } },
    ]);

    // Sequential routing: only the lowest-role tier gets emailed now — same
    // pattern as documents/[id]/send/route.ts. Later tiers are picked up
    // automatically by the existing tier-progression logic in
    // sign/[token]/submit/route.ts once the prior tier finishes; nothing new
    // needed there.
    const firstTier = Math.min(...createdSigners.map((s) => s.order_index));
    const toNotify = createdSigners.filter((s) => s.order_index === firstTier);

    const domainChecks = await Promise.all(toNotify.map((s) => checkEmailDomainHasMx(s.email)));
    const domainWarnings = domainChecks.filter((c) => !c.ok).map((c) => (c as { reason: string }).reason);

    for (const signer of toNotify) {
      try {
        const { id: emailId, error: emailError } = await sendSignerInviteEmail({
          to: signer.email,
          signerName: signer.name,
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
    }

    await admin
      .from("signers")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .in(
        "id",
        toNotify.map((s) => s.id)
      );

    return NextResponse.json(
      {
        id: doc.id,
        status: doc.status,
        signers: createdSigners.map((s) => ({ id: s.id, role: s.order_index, email: s.email })),
        ...(domainWarnings.length > 0 ? { domain_warnings: domainWarnings } : {}),
      },
      { status: 201 }
    );
  }

  // --- Single-signer path (unchanged) --------------------------------------
  const { data: signer, error: signerError } = await admin
    .from("signers")
    .insert({
      document_id: doc.id,
      email: parsed.data.signer!.email,
      name: parsed.data.signer!.name || null,
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
  const domainCheck = await checkEmailDomainHasMx(parsed.data.signer!.email);

  try {
    const { id: emailId, error: emailError } = await sendSignerInviteEmail({
      to: parsed.data.signer!.email,
      signerName: parsed.data.signer!.name || null,
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
