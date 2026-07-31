import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignerInviteEmail } from "@/lib/email";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";
import { checkConsoleCap, recordConsoleUsage } from "@/lib/console-usage";

// Shared action functions behind the console chat (src/app/api/console/chat)
// and the API-key-authenticated bulk-send endpoint
// (src/app/api/v1/documents/bulk-send). CONSOLE_UX_SCOPE.md's v1 tool set:
// send_document, bulk_send, check_status/list_documents, void_document.
//
// Deliberately NOT reused by the existing /api/v1/documents POST route (the
// original, richer public API — multi-party signers, expires_at, invite
// customization) or /api/templates/[id]/bulk-send (the existing
// session-authenticated dashboard bulk-send) — those are shipped, tested
// code paths and this work doesn't touch them. sendDocumentAction/
// bulkSendAction below are intentionally simpler (template + single
// signer(s) only), matching the narrow v1 tool set, not a replacement for
// either existing route.

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

export type ConsoleActionError = { ok: false; error: string; status: number };

/** Pure validation/normalization, split out from sendDocumentAction so it's
 *  unit-testable without a Supabase client (same extract-the-pure-part
 *  precedent as resolveActiveOrgId in org.ts). Accepts anything a chat
 *  model might plausibly produce for "when does this expire" and either
 *  normalizes it to a real ISO datetime or reports why it couldn't. */
export function parseExpiresAt(expiresAt: string | null | undefined): { ok: true; iso: string | null } | { ok: false; error: string } {
  if (!expiresAt) return { ok: true, iso: null };
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Couldn't understand that expiration date — use a full date like 2026-09-30." };
  }
  return { ok: true, iso: parsed.toISOString() };
}

async function loadOrgAndTemplate(orgId: string, templateId: string) {
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("name, owner_id").eq("id", orgId).single();
  const { data: template } = await admin
    .from("templates")
    .select("id, org_id, name, base_file_path, page_count, field_map")
    .eq("id", templateId)
    .single();
  return { admin, org, template };
}

/** Creates and sends one document from a template to one signer — the
 *  console chat's `send_document` tool and the per-recipient unit of
 *  `bulk_send`. If `metered` is true, checks the org's spend cap BEFORE
 *  creating anything, and records usage after a successful send. Callers
 *  are responsible for confirming with the user before calling this for
 *  real (see the chat backend's confirm-before-send guardrail).
 *
 *  `expiresAt`/`authRequired`/`inviteSubject`/`inviteMessage` (2026-07-31)
 *  mirror the existing `/api/v1/documents` route's optional fields
 *  byte-for-byte (same column names, same "omit means default" semantics,
 *  same 200/2000-char caps on the invite text) — console was previously
 *  the only send path with no way to set any of them at all. `recipientNotice`
 *  deliberately NOT included: it's dashboard-only even on the richer v1
 *  API, not something to newly invent here. */
export async function sendDocumentAction(params: {
  orgId: string;
  templateId: string;
  signerEmail: string;
  signerName?: string | null;
  metered: boolean;
  expiresAt?: string | null;
  authRequired?: boolean;
  inviteSubject?: string | null;
  inviteMessage?: string | null;
}): Promise<{ ok: true; documentId: string; domainWarning?: string } | ConsoleActionError> {
  const { orgId, templateId, signerEmail, signerName, metered, expiresAt, authRequired, inviteSubject, inviteMessage } = params;

  const expiresAtResult = parseExpiresAt(expiresAt);
  if (!expiresAtResult.ok) return { ok: false, error: expiresAtResult.error, status: 400 };
  const expiresAtIso = expiresAtResult.iso;
  const inviteSubjectTrimmed = inviteSubject?.trim().slice(0, 200) || null;
  const inviteMessageTrimmed = inviteMessage?.trim().slice(0, 2000) || null;

  if (metered) {
    const cap = await checkConsoleCap(orgId);
    if (!cap.allowed) return { ok: false, error: cap.reason, status: 402 };
  }

  const { admin, org, template } = await loadOrgAndTemplate(orgId, templateId);
  if (!org || !template || template.org_id !== orgId) {
    return { ok: false, error: "Template not found.", status: 404 };
  }
  const fieldMap = (template.field_map as TemplateFieldMapEntry[]) || [];
  if (fieldMap.length === 0) {
    return { ok: false, error: "This template has no fields placed yet.", status: 400 };
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
      expires_at: expiresAtIso,
      invite_subject: inviteSubjectTrimmed,
      invite_message: inviteMessageTrimmed,
    })
    .select("id")
    .single();
  if (docError || !doc) {
    console.error("Console action: create document failed", docError);
    return { ok: false, error: "Couldn't create the document.", status: 500 };
  }

  const { data: signer, error: signerError } = await admin
    .from("signers")
    .insert({
      document_id: doc.id,
      email: signerEmail,
      name: signerName || null,
      order_index: 0,
      status: "sent",
      sent_at: new Date().toISOString(),
      auth_required: authRequired ?? false,
    })
    .select("id, signing_token")
    .single();
  if (signerError || !signer) {
    console.error("Console action: create signer failed", signerError);
    return { ok: false, error: "Couldn't add the signer.", status: 500 };
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
    { document_id: doc.id, event_type: "created", metadata: { from_template: template.id, via_console: true } },
    { document_id: doc.id, event_type: "sent", metadata: { via_console: true } },
  ]);

  const domainCheck = await checkEmailDomainHasMx(signerEmail);

  try {
    const { id: emailId, error: emailError } = await sendSignerInviteEmail({
      to: signerEmail,
      signerName: signerName || null,
      senderName: org.name,
      documentTitle: template.name,
      signingToken: signer.signing_token,
      inviteSubject: inviteSubjectTrimmed,
      inviteMessage: inviteMessageTrimmed,
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
    console.error("Console action: invite email failed", err);
  }

  // Awaited (not fire-and-forget) — bulkSendAction below relies on the
  // counter being up to date before its next iteration's cap check.
  if (metered) await recordConsoleUsage(orgId);

  return { ok: true, documentId: doc.id, ...(domainCheck.ok ? {} : { domainWarning: domainCheck.reason }) };
}

/** Sends the same template to many recipients, each as their own
 *  independent document — same shape as the existing dashboard bulk-send
 *  feature. Stops partway through (rather than failing the whole batch)
 *  if the spend cap is hit mid-run, reporting exactly how many sent before
 *  that happened. `expiresAt`/`authRequired`/`inviteSubject`/`inviteMessage`
 *  (2026-07-31) apply identically to every recipient in the batch — one
 *  set of send settings per bulk-send call, not per-recipient.
 *
 *  No hard recipient-count cap (2026-07-31, direct instruction — dropped
 *  the previous 200-per-call limit). Both callers of this function
 *  (console-chat.ts's bulk_send tool, and /api/v1/documents/bulk-send) are
 *  always metered — the per-recipient $ spend cap checked in the loop
 *  below is what actually bounds runaway usage now, so a separate fixed
 *  headcount cap on top of it was redundant. Unrelated to, and doesn't
 *  touch, the dashboard's own bulk-send (/api/templates/[id]/bulk-send),
 *  which is unmetered and keeps its own 200-recipient limit. */
export async function bulkSendAction(params: {
  orgId: string;
  templateId: string;
  recipients: { email: string; name?: string | null }[];
  metered: boolean;
  expiresAt?: string | null;
  authRequired?: boolean;
  inviteSubject?: string | null;
  inviteMessage?: string | null;
}): Promise<
  | { ok: true; sent: { documentId: string; email: string }[]; skippedCapReached: string[] }
  | ConsoleActionError
> {
  const { orgId, templateId, recipients, metered, expiresAt, authRequired, inviteSubject, inviteMessage } = params;
  if (recipients.length === 0) return { ok: false, error: "No recipients provided.", status: 400 };

  const sent: { documentId: string; email: string }[] = [];
  const skippedCapReached: string[] = [];

  for (const recipient of recipients) {
    if (metered) {
      const cap = await checkConsoleCap(orgId);
      if (!cap.allowed) {
        skippedCapReached.push(recipient.email, ...recipients.slice(recipients.indexOf(recipient) + 1).map((r) => r.email));
        break;
      }
    }
    const result = await sendDocumentAction({
      orgId,
      templateId,
      signerEmail: recipient.email,
      signerName: recipient.name,
      metered,
      expiresAt,
      authRequired,
      inviteSubject,
      inviteMessage,
    });
    if (result.ok) sent.push({ documentId: result.documentId, email: recipient.email });
    // A single bad recipient (e.g. template lookup race) doesn't need its
    // own reporting slot here — template-not-found would fail identically
    // for every recipient, so surface that as a top-level error instead.
    else if (result.status === 404 || result.status === 400) return result;
  }

  return { ok: true, sent, skippedCapReached };
}

export async function checkStatusAction(
  orgId: string,
  documentId: string
): Promise<
  | { ok: true; id: string; title: string; status: string; signers: { email: string; status: string }[] }
  | ConsoleActionError
> {
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("id, org_id, title, status")
    .eq("id", documentId)
    .single();
  if (!doc || doc.org_id !== orgId) return { ok: false, error: "Document not found.", status: 404 };

  const { data: signers } = await admin.from("signers").select("email, status").eq("document_id", documentId);

  return { ok: true, id: doc.id, title: doc.title, status: doc.status, signers: signers || [] };
}

export async function listDocumentsAction(
  orgId: string,
  opts: { status?: string; limit?: number } = {}
): Promise<{ ok: true; documents: { id: string; title: string; status: string; created_at: string }[] } | ConsoleActionError> {
  const admin = createAdminClient();
  let query = admin
    .from("documents")
    .select("id, title, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(Math.min(50, Math.max(1, opts.limit ?? 10)));

  if (opts.status) query = query.eq("status", opts.status);

  const { data, error } = await query;
  if (error) {
    console.error("Console action: list documents failed", error);
    return { ok: false, error: "Couldn't list documents.", status: 500 };
  }
  return { ok: true, documents: data || [] };
}

/** Not one of the four v1 tools in CONSOLE_UX_SCOPE.md, but needed so the
 *  chat can resolve "the NDA template" to a template_id without the user
 *  having to know or paste one — read-only, no confirmation needed. */
export async function listTemplatesAction(orgId: string): Promise<{ ok: true; templates: { id: string; name: string }[] } | ConsoleActionError> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .select("id, name")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("Console action: list templates failed", error);
    return { ok: false, error: "Couldn't list templates.", status: 500 };
  }
  return { ok: true, templates: data || [] };
}

export async function voidDocumentAction(orgId: string, documentId: string): Promise<{ ok: true } | ConsoleActionError> {
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("id, org_id, status").eq("id", documentId).single();
  if (!doc || doc.org_id !== orgId) return { ok: false, error: "Document not found.", status: 404 };
  if (doc.status !== "sent") {
    return { ok: false, error: "Only documents that are out for signature can be voided.", status: 400 };
  }

  await admin.from("documents").update({ status: "voided" }).eq("id", documentId);
  await admin.from("audit_events").insert({ document_id: documentId, event_type: "voided", metadata: { via_console: true } });

  return { ok: true };
}
