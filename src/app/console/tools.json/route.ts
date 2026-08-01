import { NextResponse } from "next/server";

// Static tool manifest for console.signedby.ai (CONSOLE_AI_SIGNING_SCOPE.md)
// — the fallback half of "use your favorite AI" for agent frameworks that
// don't speak MCP (OpenAI function calling, a hand-rolled framework). For an
// actual MCP client (Claude, or anything else MCP-speaking), point it
// directly at the real MCP server instead — POST /api/mcp (see
// AI_AGENT_MCP_SIGNING_SCOPE.md), which serves these same tools natively, no
// manifest-ingestion step required. This file stays deliberately a plain
// JSON schema, not a protocol implementation: the underlying routes already
// exist and are already tested (see /api/v1), so it's a thin description of
// them, not new business logic. No auth needed to fetch the manifest itself;
// each tool call still needs a real API key, same as calling the REST API
// directly (see /developers for the full reference).
export async function GET() {
  return NextResponse.json({
    name: "signedby",
    description:
      "Send and track e-signature requests from SignedBy — signing infrastructure built for Europe. Requires an API key from a Pro-plan-or-higher SignedBy account.",
    base_url: "https://signedby.ai/api/v1",
    auth: {
      type: "bearer",
      header: "Authorization",
      instructions:
        "Generate a key in SignedBy Settings → Integration & API. Requires at least the Pro plan (metered via console.signedby.ai) or the Business plan (unlimited, included).",
    },
    mcp_server: {
      url: "https://signedby.ai/api/mcp",
      note: "If your agent framework speaks MCP directly, connect there instead of ingesting this manifest — same six tools, same API key, no wrapper needed.",
    },
    tools: [
      {
        name: "create_signing_request",
        method: "POST",
        path: "/documents",
        description:
          "Create a document from an existing template and send it to one or more signers for signature. Requires a template_id — list templates first if you don't already have one.",
        parameters: {
          template_id: { type: "string", required: true, description: "UUID of an existing template." },
          signer: {
            type: "object",
            required: false,
            description: "Single-recipient shape: { email, name?, auth_required? }. Use this or 'signers', not both.",
          },
          signers: {
            type: "array",
            required: false,
            description:
              "Multi-party shape: [{ role, email, name?, auth_required? }, ...]. 'role' maps to the template's Party 1/2/... field assignments.",
          },
          expires_at: { type: "string", required: false, description: "UTC ISO-8601 datetime, e.g. 2026-08-15T00:00:00Z." },
          invite_subject: { type: "string", required: false },
          invite_message: { type: "string", required: false },
        },
      },
      {
        name: "list_documents",
        method: "GET",
        path: "/documents",
        description: "List/search the org's documents. Query params: status, limit (max 100), offset.",
        parameters: {
          status: { type: "string", required: false, enum: ["draft", "sent", "completed", "declined", "voided"] },
          limit: { type: "number", required: false },
          offset: { type: "number", required: false },
        },
      },
      {
        name: "get_document",
        method: "GET",
        path: "/documents/{id}",
        description: "Get a single document's status and each signer's progress.",
        parameters: { id: { type: "string", required: true } },
      },
      {
        name: "list_templates",
        method: "GET",
        path: "/templates",
        description: "List the org's templates, to find a template_id for create_signing_request.",
        parameters: {},
      },
      {
        name: "void_document",
        method: "POST",
        path: "/documents/{id}/void",
        description: "Cancel a document that's still out for signature (status must be 'sent').",
        parameters: { id: { type: "string", required: true } },
      },
    ],
    webhooks: {
      description:
        "Register an endpoint in Settings → Webhooks to get notified on document.viewed / document.signed / document.completed / document.declined, so an agent loop can react without polling. See https://signedby.ai/developers#webhooks.",
    },
  });
}
