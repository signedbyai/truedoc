import { NextResponse } from "next/server";

// A markdown transcription of /developers, for anything (agent, LLM,
// grep-happy human) that wants the API reference as text rather than
// rendered HTML. Content here is copied verbatim from developers/page.tsx's
// own copy/request/response strings, not re-derived or summarized -- if
// that page's content changes, this needs the matching update by hand
// (no shared source of truth yet; flagged rather than solved, since a real
// content-negotiation pipeline is more than this pass covers).
const MARKDOWN = `# SignedBy API

> REST API and outbound webhooks, starting on the $7/mo Pro plan (metered) and fully unlimited on Business ($29/mo) -- no separate developer plan. Create and send documents from your CRM, get notified on sign/complete, and connect via Make. A Model Context Protocol (MCP) server is also available for AI agents.

Human-readable version: https://signedby.ai/developers

## Authentication

Generate a key from Settings -> Integration & API -- every plan can generate one now, including Free. Send it as a bearer token on every request:

\`\`\`
Authorization: Bearer sb_live_...
\`\`\`

Missing or invalid keys get a 401. Business is unlimited; Pro and Team are metered (100 free document-sends/month, then billed per document -- see /console for pricing); Free is capped at the same 3 documents/month the dashboard gives you.

\`\`\`
401  { "error": "Missing API key. Pass it as 'Authorization: Bearer <key>'." }
401  { "error": "Invalid API key." }
402  { "error": "You've hit the Free plan's 3 documents/month limit. Upgrade to keep going." }
\`\`\`

## Endpoints

### POST /api/v1/documents

Create a document from a template and send it to one signer.

\`\`\`
curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "3c78a1e4-dc56-4769-87f6-65e344dd6d8f",
    "signer": { "email": "jane@acme.com", "name": "Jane", "auth_required": false },
    "expires_at": "2026-08-15T00:00:00Z",
    "invite_subject": "Please sign your Acme agreement",
    "invite_message": "Thanks for your business -- just one form to go."
  }'
\`\`\`

Response:

\`\`\`
201
{
  "id": "7fdd90eb-9152-4031-a767-c0632126dc53",
  "status": "sent",
  "expires_at": "2026-08-15T00:00:00Z",
  "auth_required": false
}
\`\`\`

Multi-party version -- send the same template to 2+ role-tagged signers in one call. \`role\` maps to the template's Party 1 / Party 2 / ... field assignments:

\`\`\`
curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "3c78a1e4-dc56-4769-87f6-65e344dd6d8f",
    "signers": [
      { "role": 0, "email": "buyer@acme.com",  "name": "Buyer",  "auth_required": true  },
      { "role": 1, "email": "seller@acme.com", "name": "Seller", "auth_required": false }
    ]
  }'
\`\`\`

### GET /api/v1/documents?status=completed&limit=20&offset=0

List/search the org's documents. \`status\` is optional (draft, sent, completed, declined, voided); \`limit\` defaults to 20, max 100.

### GET /api/v1/documents/{id}

Get a single document's status and its signers' progress.

### GET /api/v1/templates

List the org's templates, for populating a dropdown in your own UI or a Make scenario.

### GET /api/v1/documents/{id}/signed-file

Download the completed, flattened PDF once every signer has signed. 404 until it's ready.

### POST /api/v1/documents/{id}/void

Cancel a document that's out for signature -- e.g. "deal fell through, kill the pending contract." Only works while status is 'sent'.

## Webhooks

Available on Pro and higher. Register one or more endpoint URLs in Settings -> Webhooks (each gets its own signing secret). Every enabled endpoint receives all four document lifecycle events:

- \`document.viewed\` -- the signer opened the link for the first time
- \`document.signed\` -- one signer completed their part (fires per signer, not just once)
- \`document.completed\` -- every signer has finished
- \`document.declined\` -- a signer declined to sign

Each delivery is signed with your endpoint's own secret via an \`X-SignedBy-Signature\` header:

\`\`\`
X-SignedBy-Signature: sha256=6f2c9e...
\`\`\`

Verify it (Node.js) before trusting the payload:

\`\`\`js
const crypto = require("crypto");

function verify(rawBody, signatureHeader, secret) {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}
\`\`\`

Delivery is fire-and-forget with one retry after a 1-second delay (5-second timeout per attempt) -- there's no persistent delivery log or manual-redelivery UI yet, so make your endpoint idempotent and check the document's current status via \`GET /api/v1/documents/{id}\` if you need to reconcile a missed event.

## MCP server (for AI agents)

SignedBy also runs a real Model Context Protocol (MCP) server at \`https://signedby.ai/api/mcp\` (Streamable HTTP transport, stateless). Requires the Pro plan or higher -- this rides on Console's metered access (100 free document-sends/month, then billed per document), same metering on every plan including Business. Auth: \`Authorization: Bearer <your SignedBy API key>\`.

Claude Code / Claude Desktop config:

\`\`\`json
{
  "mcpServers": {
    "signedby": {
      "url": "https://signedby.ai/api/mcp",
      "headers": { "Authorization": "Bearer sb_live_..." }
    }
  }
}
\`\`\`

Tools:

- \`list_templates\` -- list the org's templates, to find a template_id for create_and_send_document.
- \`create_and_send_document\` -- create a document from a template and send it to one signer. Triggers the send only -- the signer still opens the link and signs it themselves.
- \`get_document_status\` -- look up a document's status and each signer's status by id.
- \`list_documents\` -- list the org's documents, optionally filtered by status.
- \`void_document\` -- cancel a document that's still out for signature (status must be 'sent').
- \`get_signed_file\` -- download the completed, signed PDF once every signer has finished.
- \`seal_document\` -- certify a finished PDF as unaltered and identity-verified (Verified Badge). Not a signature request -- it never asks anyone else to sign anything.

Every document an agent creates, voids, or seals through this server is tagged in the audit trail (an \`agent_triggered\` flag alongside the usual event log), so it's always possible to tell an agent-initiated action apart from one a person did directly. The recipient/signer side is completely unchanged -- an AI agent can trigger a signing request, but the recipient still has to open the link and sign it themselves.

## FAQ

**What format does expires_at need?** A full UTC ISO-8601 datetime ending in \`Z\` -- e.g. \`2026-08-15T00:00:00Z\`. A timezone offset like \`+02:00\` is rejected; convert to UTC first.

**How does multi-party role numbering work?** \`role\` matches the Party 1 / Party 2 / ... assignments already on the template -- role \`0\` is Party 1, role \`1\` is Party 2, and so on. Every role actually used on the template needs a matching signer, or the request is rejected up front.

**Is there a sandbox or test mode?** No -- the free tier's 3 documents/month is real enough to build and test integrations against before upgrading.

**What happens with auth_required signers?** That signer has to enter a one-time email code before the document opens at all -- same per-recipient verification the dashboard offers, free on every plan.
`;

export async function GET() {
  return new NextResponse(MARKDOWN, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
