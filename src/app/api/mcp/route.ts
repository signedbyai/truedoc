import { NextResponse } from "next/server";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateApiRequest } from "@/lib/api-auth";
import { planHasFeature } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2, uploadToR2 } from "@/lib/r2";
import { appUrl } from "@/lib/email";
import {
  sendDocumentAction,
  checkStatusAction,
  listDocumentsAction,
  listTemplatesAction,
  voidDocumentAction,
} from "@/lib/console-actions";
import { sealDocumentAction, isLoadablePdf } from "@/lib/verified-badge-actions";

// Matches the console upload UI's own 25MB product cap
// (console-chat.tsx's MAX_TEMPLATE_FILE_BYTES) — same ceiling, just applied
// to a base64-decoded byte length here instead of a File object's .size.
const MAX_SEAL_FILE_BYTES = 25 * 1024 * 1024;

// POST /api/mcp — a real Model Context Protocol server (AI_AGENT_MCP_SIGNING_SCOPE.md),
// distinct from CRM_MCP_READINESS_PHASE1_SCOPE.md's REST+webhooks work for
// middleware platforms (Make/Zapier). This is for an actual MCP-speaking
// agent (Claude, or any other) to call SignedBy directly as named tools,
// rather than a human typing into the console chat or a no-code scenario.
//
// No new business logic here — every tool is a thin wrapper around the same
// console-actions.ts functions the console chat and /api/v1/documents/bulk-send
// already use (see CONSOLE_AI_SIGNING_SCOPE.md item 5, which named this as a
// possible fast-follow). The one real addition is provenance: every document
// created or voided through this route is tagged `via_mcp`/`agent_triggered`
// in `audit_events.metadata` (see auditProvenance() in console-actions.ts),
// so a sender's audit trail can always tell "a person sent this" apart from
// "an agent sent this on a person's behalf." The recipient/signer side is
// completely untouched — every document still requires the signer to open
// the link and sign themselves, through the existing per-recipient OTP gate
// if enabled. An AI agent can trigger a send here; it can never sign.
//
// Auth + access decisions (2026-08-01, recorded in AI_AGENT_MCP_SIGNING_SCOPE.md):
//   - Ship against Console's metered `consoleAccess` key, not the flat
//     Business `apiAccess` perk. Gated separately from authenticateApiRequest's
//     own ok/not-ok check (which also accepts Business-only orgs) so this
//     route can require consoleAccess specifically, then always bills through
//     the metered path — same "console is metered over and above standard
//     plans for every tier including Business" policy already established for
//     /api/v1/documents/bulk-send (see that route's file header).
//   - No "hold for review" approval gate for v1 — audit-trail provenance
//     alone is the answer for now.
//   - No per-key labeling/scoping yet — ships on the existing single
//     API-key-per-org model; revisit once real agent usage exists to design
//     against.

const LIST_STATUS_OPTIONS = ["draft", "sent", "completed", "declined", "voided"] as const;

function textResult(data: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }], isError };
}

/** Builds a fresh McpServer instance scoped to one authenticated org — a new
 *  server (and transport) per request, matching the SDK's own stateless-mode
 *  guidance, so each org's tool handlers close over its own orgId/orgName
 *  rather than any shared/global state. */
function buildMcpServer(orgId: string, orgName: string): McpServer {
  const mcp = new McpServer({ name: "signedby", version: "1.0.0" }, { instructions: `Send and manage signing requests for ${orgName} on SignedBy. Every document still requires the human signer to open the link and sign themselves — these tools trigger a signing request, they never sign on anyone's behalf.` });

  mcp.registerTool(
    "list_templates",
    {
      title: "List templates",
      description: "List this organization's document templates (id + name) — use this to resolve which template_id to pass to create_and_send_document.",
      inputSchema: {},
    },
    async () => {
      const result = await listTemplatesAction(orgId);
      if (!result.ok) return textResult({ error: result.error }, true);
      return textResult({ templates: result.templates });
    }
  );

  mcp.registerTool(
    "create_and_send_document",
    {
      title: "Create and send a signing request",
      description:
        "Creates a document from a template and sends it to one signer for signature. This triggers the send only — the signer still has to open the emailed link and sign it themselves, same as every other document on SignedBy.",
      inputSchema: {
        template_id: z.string().uuid().describe("A template id from list_templates"),
        signer_email: z.string().trim().toLowerCase().email(),
        signer_name: z.string().trim().max(200).optional(),
        expires_at: z.string().trim().optional().describe("ISO datetime the signing link should expire at, optional"),
        auth_required: z.boolean().optional().describe("Require the signer to enter an emailed one-time code before the document opens"),
        invite_subject: z.string().trim().max(200).optional(),
        invite_message: z.string().trim().max(2000).optional(),
      },
    },
    async (args) => {
      const result = await sendDocumentAction({
        orgId,
        templateId: args.template_id,
        signerEmail: args.signer_email,
        signerName: args.signer_name ?? null,
        metered: true,
        expiresAt: args.expires_at ?? null,
        authRequired: args.auth_required,
        inviteSubject: args.invite_subject,
        inviteMessage: args.invite_message,
        source: "mcp",
      });
      if (!result.ok) return textResult({ error: result.error }, true);
      return textResult({
        document_id: result.documentId,
        ...(result.domainWarning ? { domain_warning: result.domainWarning } : {}),
      });
    }
  );

  mcp.registerTool(
    "get_document_status",
    {
      title: "Get document status",
      description: "Look up a document's status and each signer's status by document id.",
      inputSchema: { document_id: z.string().uuid() },
    },
    async (args) => {
      const result = await checkStatusAction(orgId, args.document_id);
      if (!result.ok) return textResult({ error: result.error }, true);
      return textResult(result);
    }
  );

  mcp.registerTool(
    "list_documents",
    {
      title: "List documents",
      description: "List this organization's documents, optionally filtered by status.",
      inputSchema: {
        status: z.enum(LIST_STATUS_OPTIONS).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (args) => {
      const result = await listDocumentsAction(orgId, { status: args.status, limit: args.limit });
      if (!result.ok) return textResult({ error: result.error }, true);
      return textResult({ documents: result.documents });
    }
  );

  mcp.registerTool(
    "void_document",
    {
      title: "Void a document",
      description: "Cancels a document that's still out for signature. Only documents with status 'sent' can be voided.",
      inputSchema: { document_id: z.string().uuid() },
    },
    async (args) => {
      const result = await voidDocumentAction(orgId, args.document_id, "mcp");
      if (!result.ok) return textResult({ error: result.error }, true);
      return textResult({ success: true });
    }
  );

  mcp.registerTool(
    "get_signed_file",
    {
      title: "Download the signed PDF",
      description: "Downloads the completed, signed PDF for a document once every signer has finished.",
      inputSchema: { document_id: z.string().uuid() },
    },
    async (args) => {
      const admin = createAdminClient();
      const { data: doc } = await admin
        .from("documents")
        .select("org_id, title, signed_file_path")
        .eq("id", args.document_id)
        .single();

      if (!doc || doc.org_id !== orgId) return textResult({ error: "Document not found." }, true);
      if (!doc.signed_file_path) return textResult({ error: "Signed PDF isn't ready yet." }, true);

      try {
        const { body, contentType } = await getFromR2(doc.signed_file_path);
        return {
          content: [
            {
              type: "resource" as const,
              resource: {
                uri: `signedby://documents/${args.document_id}/signed.pdf`,
                mimeType: contentType,
                blob: body.toString("base64"),
              },
            },
          ],
        };
      } catch (err) {
        console.error("MCP get_signed_file: R2 fetch failed", err);
        return textResult({ error: "Could not load file." }, true);
      }
    }
  );

  mcp.registerTool(
    "seal_document",
    {
      title: "Seal a document for Verified Badge",
      description:
        "Certifies a finished PDF as unaltered and identity-verified: hashes it, timestamps it, and returns a scannable proof badge plus a public ledger link anyone can check with no account needed. This is NOT a signature request — it never asks anyone else to sign anything, it certifies a file this organization already considers final (VERIFIED_BADGE_SCOPE.md). Requires the organization to have completed a one-time Stripe Identity check first (from the SignedBy dashboard's Settings page, not through this tool) — call this and read the error message if you're not sure whether that's done yet.",
      inputSchema: {
        file_base64: z.string().describe("The PDF file's bytes, base64-encoded"),
        filename: z.string().trim().max(200).optional(),
        certificate_mode: z
          .enum(["appended", "separate", "both"])
          .optional()
          .describe(
            "'appended' bakes the certificate into the file. 'separate' returns the original file untouched plus a standalone certificate PDF. 'both' returns all three (default)."
          ),
      },
    },
    async (args) => {
      const bytes = Buffer.from(args.file_base64, "base64");
      if (bytes.length === 0 || bytes.length > MAX_SEAL_FILE_BYTES) {
        return textResult({ error: "File is empty, unreadable, or exceeds the 25MB limit." }, true);
      }
      if (!(await isLoadablePdf(bytes))) {
        return textResult({ error: "That doesn't look like a valid PDF (PDFs only for v1)." }, true);
      }

      const admin = createAdminClient();
      const { data: org } = await admin.from("organizations").select("owner_id").eq("id", orgId).single();
      if (!org) return textResult({ error: "Organization not found." }, true);

      const documentId = crypto.randomUUID();
      const safeFilename = (args.filename || "document.pdf").replace(/[^\w.\- ]/g, "").trim() || "document.pdf";
      const key = `${orgId}/${documentId}/${safeFilename}`;

      try {
        await uploadToR2(key, bytes, "application/pdf");
      } catch (err) {
        console.error("MCP seal_document: R2 upload failed", err);
        return textResult({ error: "Upload failed. Try again." }, true);
      }

      const { error: insertError } = await admin.from("documents").insert({
        id: documentId,
        org_id: orgId,
        owner_id: org.owner_id,
        title: safeFilename.replace(/\.pdf$/i, "") || "Sealed document",
        status: "draft",
        file_path: key,
        original_filename: safeFilename,
      });
      if (insertError) {
        console.error("MCP seal_document: create document failed", insertError);
        return textResult({ error: "Couldn't save the uploaded file." }, true);
      }

      const result = await sealDocumentAction({
        orgId,
        documentId,
        // Defaults to "both" (2026-08-05, direct ask — matches Console
        // chat's own org-level default flip in the same session, migration
        // 0048) rather than reading the org's verified_badge_certificate_
        // mode column: this tool never asked the appended/separate/both
        // question in the first place (an MCP caller can't answer a
        // conversational follow-up), so it just needs a sane default, not
        // the same "should we skip asking" logic Console chat has.
        certificateMode: args.certificate_mode ?? "both",
        metered: true,
        source: "mcp",
      });
      if (!result.ok) return textResult({ error: result.error }, true);

      return textResult({
        document_id: result.documentId,
        verify_url: result.verifyUrl,
        sealed_file_url: result.hasSignedFile ? `${appUrl()}/api/v1/documents/${result.documentId}/signed-file` : null,
        certificate_file_url: result.hasCertificateFile ? `${appUrl()}/api/v1/documents/${result.documentId}/certificate` : null,
        badge_image_url: `${appUrl()}/api/v1/documents/${result.documentId}/badge`,
      });
    }
  );

  return mcp;
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Ship against Console's metered key (2026-08-01 decision) — require
  // `consoleAccess` specifically (Pro+, includes Business) rather than
  // accepting a Business-only `apiAccess` org here just because
  // authenticateApiRequest's generic ok-check does. Business orgs still get
  // in (consoleAccess includes "business"), but per the same policy already
  // shipped on /api/v1/documents/bulk-send, MCP usage is always metered
  // below regardless of `auth.metered` — this is Console product surface,
  // not the flat included Business API perk.
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("plan").eq("id", auth.orgId).single();
  if (!org || !planHasFeature(org.plan, "consoleAccess")) {
    return NextResponse.json(
      { error: "MCP access requires the Pro plan or higher — see console.signedby.ai." },
      { status: 402 }
    );
  }

  const rateOk = await checkRateLimit(`api-mcp:${auth.orgId}`, 60, 3600);
  if (!rateOk) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const mcpServer = buildMcpServer(auth.orgId, auth.orgName);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — a fresh server/transport per request, no session to track
    enableJsonResponse: true, // simple request/response, no need for an SSE stream for these tool calls
  });

  try {
    await mcpServer.connect(transport);
    return await transport.handleRequest(request);
  } catch (err) {
    console.error("MCP request handling failed", err);
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null },
      { status: 500 }
    );
  }
}

// Stateless mode doesn't support a standalone SSE stream (GET) or session
// termination (DELETE) — matches the SDK's own stateless example.
function methodNotAllowed() {
  return NextResponse.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null },
    { status: 405 }
  );
}
export async function GET() {
  return methodNotAllowed();
}
export async function DELETE() {
  return methodNotAllowed();
}
