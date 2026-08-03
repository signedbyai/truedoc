import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignerInviteEmail } from "@/lib/email";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";
import { checkConsoleCap, recordConsoleUsage } from "@/lib/console-usage";
import { planHasFeature } from "@/lib/plan";
import { getReferralSummary, type ReferralSummary } from "@/lib/referral";

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

/** Whether a template's fields can be resolved to a single real signer —
 *  used by the two "create-and-send-in-one-step" paths (this file's
 *  sendDocumentAction below, and /api/templates/[id]/bulk-send) that only
 *  ever create one signer per document. A template built for 2+ parties
 *  (2+ distinct non-null `role` values in its field_map) has no home for
 *  the second party's fields on a single-signer send — previously those
 *  fields were inserted with signer_id left null and never resolved,
 *  making them invisible to the signer regardless of how many signers the
 *  template was designed for (2026-08-02 bug: signer could submit with
 *  zero fields to fill in). Rather than silently dropping them, block up
 *  front with a clear error. Pure/exported so it's unit-testable without a
 *  Supabase client (same extract-the-pure-part precedent as
 *  parseExpiresAt/auditProvenance above). */
export function checkSingleSignerRoleCount(fieldMap: { role: number | null }[]): { ok: true } | { ok: false; roleCount: number } {
  const distinctRoles = new Set(fieldMap.map((f) => f.role).filter((r): r is number => r !== null));
  if (distinctRoles.size > 1) return { ok: false, roleCount: distinctRoles.size };
  return { ok: true };
}

/** Pure mapping from caller provenance to the audit_events.metadata flags to
 *  attach — split out so it's unit-testable without a Supabase client (same
 *  extract-the-pure-part precedent as parseExpiresAt above). Keeps
 *  via_console's existing boolean-flag shape (matching via_api on the plain
 *  /api/v1/documents route) rather than replacing it with a bare `source`
 *  string, so nothing already reading via_console breaks; agent_triggered is
 *  the one new field a downstream consumer (audit UI, webhook payload) needs
 *  to key off of to show "sent by an AI agent." See
 *  AI_AGENT_MCP_SIGNING_SCOPE.md. */
export function auditProvenance(source: "console" | "mcp"): Record<string, boolean> {
  return source === "mcp" ? { via_mcp: true, agent_triggered: true } : { via_console: true };
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
  // Provenance (AI_AGENT_MCP_SIGNING_SCOPE.md, 2026-08-01) — which caller
  // triggered this send, recorded on the audit_events rows below so a
  // sender's audit trail can distinguish "a person sent this" (console
  // chat) from "an agent sent this on a person's behalf" (MCP tool call).
  // Defaults to "console" so every existing caller (console-chat.ts,
  // bulkSendAction below) keeps its current via_console:true metadata
  // unchanged with no call-site updates required.
  source?: "console" | "mcp";
}): Promise<{ ok: true; documentId: string; domainWarning?: string } | ConsoleActionError> {
  const { orgId, templateId, signerEmail, signerName, metered, expiresAt, authRequired, inviteSubject, inviteMessage, source = "console" } = params;

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
  const roleCheck = checkSingleSignerRoleCount(fieldMap);
  if (!roleCheck.ok) {
    return {
      ok: false,
      error: `This template has fields for ${roleCheck.roleCount} different signers. Sending it this way only supports one recipient — open it from Documents → Use template to send it with the right number of recipients.`,
      status: 400,
    };
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

  // roleCheck above guarantees at most one distinct role across fieldMap,
  // so every field belongs to the single signer just created — resolve it
  // now rather than leaving signer_id null (see checkSingleSignerRoleCount's
  // doc comment for the bug this replaced).
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
  const { error: fieldsError } = await admin.from("document_fields").insert(rows);
  if (fieldsError) {
    console.error("Console action: insert fields failed", fieldsError);
    return { ok: false, error: "Couldn't set up the fields on this document.", status: 500 };
  }

  const provenance = auditProvenance(source);
  await admin.from("audit_events").insert([
    { document_id: doc.id, event_type: "created", metadata: { from_template: template.id, ...provenance } },
    { document_id: doc.id, event_type: "sent", metadata: { ...provenance } },
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

// Safety valve for the loop below, not a business/billing cap
// (2026-07-31 — see CONSOLE_BULK_SEND_TIMEOUT_SCOPE.md). With the old
// 200-recipient cap gone, a large enough batch could otherwise run past
// this request's real serverless timeout and get killed mid-run with no
// structured answer to "how far did it get." A wall-clock budget, checked
// once per recipient, stops the loop cleanly with time to spare instead —
// same "sent X, here's who's left" shape as the spend-cap early-stop
// below, just a second reason. Both callers now also set an explicit
// `export const maxDuration = 60` on their routes (console/chat/route.ts,
// v1/documents/bulk-send/route.ts) so this budget is checked against a
// real, known ceiling rather than an unconfirmed platform default.
const BULK_SEND_TIME_BUDGET_MS = 45_000; // ~15s of the 60s maxDuration left over for request overhead (auth, body parsing, and — on the chat path — the Mistral round-trip)

/** Sends the same template to many recipients, each as their own
 *  independent document — same shape as the existing dashboard bulk-send
 *  feature. Stops partway through (rather than failing the whole batch) if
 *  the spend cap is hit OR the time budget above runs out mid-run,
 *  reporting exactly how many sent and who's left, and why, before that
 *  happened. `expiresAt`/`authRequired`/`inviteSubject`/`inviteMessage`
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
  source?: "console" | "mcp";
}): Promise<
  | {
      ok: true;
      sent: { documentId: string; email: string }[];
      skippedCapReached: string[];
      skippedTimeoutReached: string[];
    }
  | ConsoleActionError
> {
  const { orgId, templateId, recipients, metered, expiresAt, authRequired, inviteSubject, inviteMessage, source = "console" } = params;
  if (recipients.length === 0) return { ok: false, error: "No recipients provided.", status: 400 };

  const sent: { documentId: string; email: string }[] = [];
  const skippedCapReached: string[] = [];
  const skippedTimeoutReached: string[] = [];
  const startedAt = Date.now();

  for (const recipient of recipients) {
    // Checked first, ahead of the cap check — a batch that's already run
    // long shouldn't spend more time on another cap round-trip before
    // bailing. The very first recipient always gets a real attempt: elapsed
    // time is ~0 at the top of the loop, so this can only trip on a later
    // iteration, never before anything has been sent at all.
    if (Date.now() - startedAt > BULK_SEND_TIME_BUDGET_MS) {
      skippedTimeoutReached.push(recipient.email, ...recipients.slice(recipients.indexOf(recipient) + 1).map((r) => r.email));
      break;
    }
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
      source,
    });
    if (result.ok) sent.push({ documentId: result.documentId, email: recipient.email });
    // A single bad recipient (e.g. template lookup race) doesn't need its
    // own reporting slot here — template-not-found would fail identically
    // for every recipient, so surface that as a top-level error instead.
    else if (result.status === 404 || result.status === 400) return result;
  }

  return { ok: true, sent, skippedCapReached, skippedTimeoutReached };
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

/** Not one of the original v1 tools either, added 2026-08-04 after a real
 *  gap: the console chat had no way to answer "do you have a referral
 *  program" / "what's my referral link" and, with no tool covering it,
 *  Mistral improvised a wrong answer ("SignedBy doesn't have a formal
 *  referral program"). Read-only, no confirmation needed — same shape as
 *  listTemplatesAction. Reuses referral.ts's getReferralSummary wholesale
 *  so the chat's answer always matches the dashboard/console UI's own
 *  referral card. */
export async function getReferralInfoAction(orgId: string): Promise<{ ok: true; referral: ReferralSummary } | ConsoleActionError> {
  const summary = await getReferralSummary(createAdminClient(), orgId);
  if (!summary) return { ok: false, error: "Couldn't generate a referral link.", status: 500 };
  return { ok: true, referral: summary };
}

export async function voidDocumentAction(
  orgId: string,
  documentId: string,
  source: "console" | "mcp" = "console"
): Promise<{ ok: true } | ConsoleActionError> {
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("id, org_id, status").eq("id", documentId).single();
  if (!doc || doc.org_id !== orgId) return { ok: false, error: "Document not found.", status: 404 };
  if (doc.status !== "sent") {
    return { ok: false, error: "Only documents that are out for signature can be voided.", status: 400 };
  }

  await admin.from("documents").update({ status: "voided" }).eq("id", documentId);
  await admin
    .from("audit_events")
    .insert({ document_id: documentId, event_type: "voided", metadata: { ...auditProvenance(source) } });

  return { ok: true };
}

// The per-field shape console-chat.tsx round-trips through the "Save now"
// confirm bubble's arguments — it's exactly suggest-fields.ts's
// FieldSuggestion shape (page/type/x/y/width/height/role), computed
// client-side by calling the existing, already-shipped
// POST /api/documents/[id]/suggest-fields (stateless — writes nothing) right
// after upload. Validated fresh here rather than trusted, since it's arrived
// back from the client same as bulk_send's `recipients` array does.
const templateFieldSchema = z.object({
  type: z.enum(["signature", "initials", "date", "text", "checkbox"]),
  page: z.number().int().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  role: z.number().int().min(0).nullable().optional(),
});

/** The console upload-a-template flow's "Save now" action (CONSOLE upload
 *  scope, 2026-08-01) — saves an already-uploaded document straight to
 *  `templates` using AI-suggested field placement, with no visit to the
 *  field editor. Deliberately NOT exposed to Mistral as a callable tool
 *  (see console-chat.ts's TOOLS array) — the only way to reach this is the
 *  chat UI's own "Save now" button, built with the document id/fields it
 *  already has in hand from the upload it just did, never from the model
 *  guessing or resolving an id itself. The "Review fields" alternative
 *  (multi-party documents, or ones the AI couldn't confidently read) skips
 *  this function entirely and goes through the existing field editor +
 *  its own save-as-template route instead.
 *
 *  Writes straight to `templates.field_map` rather than first writing
 *  `document_fields` and then transforming them (the shape the field-editor
 *  save-as-template route uses) — there's no intermediate document_fields
 *  state worth persisting here, since nobody reviews this document in the
 *  editor on the fast path. */
export async function saveAsTemplateAction(params: {
  orgId: string;
  documentId: string;
  name: string;
  fields: unknown[];
}): Promise<{ ok: true; templateId: string } | ConsoleActionError> {
  const { orgId, documentId } = params;

  const name = params.name.trim().slice(0, 200);
  if (!name) return { ok: false, error: "Give the template a name.", status: 400 };

  const parsedFields = z.array(templateFieldSchema).safeParse(params.fields);
  if (!parsedFields.success || parsedFields.data.length === 0) {
    return { ok: false, error: "No valid fields to save — nothing was placed on this document.", status: 400 };
  }

  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("plan").eq("id", orgId).single();
  if (!planHasFeature(org?.plan, "templates")) {
    return { ok: false, error: "Templates are a Pro plan feature. Upgrade to save documents as templates.", status: 402 };
  }

  const { data: doc } = await admin.from("documents").select("id, org_id, file_path, page_count").eq("id", documentId).single();
  if (!doc || doc.org_id !== orgId) return { ok: false, error: "Document not found.", status: 404 };

  const fieldMap: TemplateFieldMapEntry[] = parsedFields.data.map((f) => ({
    type: f.type,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    required: true, // matches the field editor's own default for AI-accepted suggestions
    role: f.role ?? null,
  }));

  const { data: template, error } = await admin
    .from("templates")
    .insert({ org_id: orgId, name, base_file_path: doc.file_path, page_count: doc.page_count, field_map: fieldMap })
    .select("id")
    .single();
  if (error || !template) {
    console.error("Console action: save as template failed", error);
    return { ok: false, error: "Couldn't save as a template.", status: 500 };
  }

  return { ok: true, templateId: template.id };
}
