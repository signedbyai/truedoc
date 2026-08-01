# AI agent triggers a signing request — scope (backlog)

Status: **BUILT 2026-08-01**, merged to master (branch `ai-agent-mcp-signing`,
plus a same-day `master` follow-up documenting it), smoke-verified in the
sandbox throughout (tsc, eslint, full vitest suite — 538 tests — and a clean
`next build` all pass). Docs added to both `/console` ("Connect an AI agent")
and `/developers` (a full "MCP server" section). Deploy to prod still owed.

## Why this one

Asked directly: "can an AI sign on behalf of a human using SignedBy?" No —
and it shouldn't, since ESIGN/UETA/eIDAS enforceability rests on a specific
person's authenticated intent to sign, not an agent's. The useful version of
the idea is narrower: an AI agent *prepares and dispatches the signing
request*, while the actual signature stays a human, OTP-gated action, same
as every document today. That's a real, buildable feature, and it's not
starting from zero — two adjacent pieces already exist:

- **Console** (`CONSOLE_AI_SIGNING_SCOPE.md`, chat UI shipped through
  2026-07-31, migrations 0040/0041 + deploy still owed) — a *human* types
  "draft a contract for X and send it to Y" and the AI drafts + sends. The
  human is still the one issuing the instruction in real time.
- **CRM/MCP Phase 1** (`CRM_MCP_READINESS_PHASE1_SCOPE.md`, built
  2026-07-29, confirmed live on dev, not yet merged to master/deployed) —
  REST API + outbound webhooks so *middleware platforms* (Make, and by
  extension Zapier-style tools) can call SignedBy. That doc explicitly notes
  "MCP" there means middleware connector platform, **not** Anthropic's Model
  Context Protocol, and explicitly lists "a real MCP server" as out of scope
  for that phase.

This doc is that missing piece: a genuine MCP server, so an external AI
agent (Claude, or any MCP-speaking agent — not a human typing into the
Console, not a no-code middleware scenario) can call SignedBy's existing API
as named tools. `CONSOLE_AI_SIGNING_SCOPE.md` item 5 already named this
("MCP manifest / function-calling schema wrapping the existing endpoints")
as a possible fast-follow to Console rather than a v1 requirement — this doc
gives that specific piece its own scope so it can ship on its own timeline,
independent of Console's metering/billing decisions.

## What it would be

A thin MCP server manifest exposing the existing `/api/v1/*` routes as
tools an agent can call directly — no new business logic, since the REST API
already does everything "create a document and send it for signature"
needs:

- `list_templates` → `GET /api/v1/templates`
- `create_and_send_document` → `POST /api/v1/documents` (template + signer(s)
  + optional `expires_at`/`auth_required`, per the 2026-07-30 addendum)
- `get_document_status` → `GET /api/v1/documents/[id]`
- `list_documents` → `GET /api/v1/documents`
- `void_document` → `POST /api/v1/documents/[id]/void`
- `get_signed_file` → `GET /api/v1/documents/[id]/signed-file`

Auth is the existing `sb_live_...` bearer API key, handed to the agent the
same way a developer would configure any MCP server today.

## How it would fit the existing code

- No new endpoints — the manifest wraps the routes in
  `src/app/api/v1/*` as-is. `authenticateApiRequest()`
  (`src/lib/api-auth.ts`) stays the single auth path; no change to
  `planHasFeature` gating (`apiAccess` Business-unlimited /
  `consoleAccess` Pro+-metered, whichever Console lands on).
- One real gap worth closing here, not solved by wrapping existing routes:
  **provenance**. Today `audit_events` records `created`/`sent`/etc. with no
  marker for *what* initiated the call — a human in the dashboard, a Make
  scenario, or an autonomous agent all look identical in the audit trail.
  Add a `source` field to the `metadata jsonb` already on `audit_events`
  (e.g. `{ source: "api", agent: true }` vs `{ source: "dashboard" }`) so a
  sender's audit log — and eventually the recipient-facing side — can
  distinguish "a person sent this" from "an agent sent this on a person's
  behalf." This is a metadata addition, not a schema/migration change.
  `CRM_MCP_READINESS_PHASE1_SCOPE.md`'s webhook payloads could carry the
  same flag for downstream systems.
  - Ties back to the original question directly: this is the mechanism
    that keeps the AI-triggered/human-signed distinction *visible*, not
    just true in theory.
- `CRM_MCP_READINESS_PHASE1_SCOPE.md` explicitly lists "per-API-key
  scopes/permissions, or multiple keys per org" as out of scope for that
  phase, on the reasoning that webhooks (not keys) needed to be
  multi-destination. Handing a raw org-wide, full-access key to an
  autonomous agent is a materially different risk than handing it to a
  human developer wiring up Make — worth reopening that decision here
  rather than inheriting it silently. Two low-cost options, not mutually
  exclusive: (a) a `label` on the key the same shape webhook endpoints
  already got ("Agent: sales-ops bot"), so at least it's identifiable in
  Settings even before real scoping exists; (b) rate limiting already
  exists (60/hour, per Console scope) and applies unchanged.

## What it doesn't solve

The recipient/signer side is completely untouched — every document created
this way still goes through the existing per-signer OTP gate
(`PER_RECIPIENT_AUTH_SCOPE.md`) if enabled, and the signer still clicks sign
themselves. This doc only changes *who or what can trigger the send*, never
*who can complete the signature*. It also doesn't add a "hold for review"
approval step before an agent-triggered send actually fires — flagged as a
real option (an AI-drafted contract auto-sent with zero human glance is a
genuine liability surface) but a separate decision from the MCP wrapper
itself, since it changes the product behavior rather than just exposing
existing behavior differently.

## Effort

Small, on top of what already exists. The MCP manifest itself is thin — same
characterization `CONSOLE_AI_SIGNING_SCOPE.md` already gives it: "the
underlying routes don't change." Net-new work is the provenance metadata
field (no migration, `audit_events.metadata` already exists) and, if wanted,
the API-key label field. The bigger open question isn't build effort, it's
sequencing against Console (does this ship as Console's MCP fast-follow, or
independently against the Business-tier `apiAccess` key, or both).

## Decisions (2026-08-01)

1. **Ship against Console's metered `consoleAccess` key**, not the
   Business `apiAccess` key, and not both. This ties the MCP manifest
   directly to Console's Pro+ gate rather than adding a second, parallel
   entry path — one key model to reason about, consistent with Console
   being the lower-barrier surface this was scoped as a fast-follow to.
2. **No "hold for review" approval gate for v1.** Audit-trail provenance
   (the `metadata.source`/`agent` flag above) is enough to start —
   revisit an approval step only if real usage shows agent-triggered
   sends causing problems, not preemptively.
3. **Per-key labeling/scoping is not built now.** Ship on the existing
   single-key-per-org model as-is; add labeling/scoping once real agent
   usage exists to design against — same "don't build ahead of demand"
   reasoning `CRM_MCP_READINESS_PHASE1_SCOPE.md` used for webhook
   delivery logs.

## Open questions

None outstanding on direction. Still requires an explicit go-ahead to
build — the decisions above resolve *what* this would be, not *whether/
when* to start.

## Build notes (2026-08-01)

Built essentially as scoped, on branch `ai-agent-mcp-signing`:

- `src/app/api/mcp/route.ts` — a real MCP server using
  `@modelcontextprotocol/sdk`'s `WebStandardStreamableHTTPServerTransport` in
  stateless mode (fresh `McpServer` + transport per request, no session
  state — a natural fit for Vercel's serverless model). Six tools:
  `list_templates`, `create_and_send_document`, `get_document_status`,
  `list_documents`, `void_document`, `get_signed_file` — each a thin wrapper
  around the existing `console-actions.ts` functions (or, for
  `get_signed_file`, the same R2 read the REST signed-file route already
  does). No new business logic, as scoped.
- Auth: `authenticateApiRequest()` unchanged, plus an explicit
  `planHasFeature(org.plan, "consoleAccess")` gate and hardcoded
  `metered: true` on every `create_and_send_document`/`void_document` call —
  mirrors `/api/v1/documents/bulk-send`'s already-shipped "console is
  metered over and above standard plans for every tier including Business"
  policy byte-for-byte, which is what "ship against Console's metered key"
  resolves to in code.
- Provenance: added `auditProvenance(source)` to `console-actions.ts` (a
  pure function, unit-tested), used by `sendDocumentAction`/
  `bulkSendAction`/`voidDocumentAction`. Defaults to `"console"` (unchanged
  behavior, `{ via_console: true }`) for every existing caller; the MCP
  route passes `source: "mcp"`, which tags `audit_events.metadata` with
  `{ via_mcp: true, agent_triggered: true }` instead. No migration needed —
  `metadata` is already `jsonb`.
- No approval gate, no per-key labeling/scoping — both deferred per the
  2026-08-01 decisions above.

The sandbox's local `@next/swc-linux-arm64-gnu` binary was corrupted
mid-build (bus error) and needed a forced reinstall to verify `next build` —
noted here in case it recurs, unrelated to this feature's own code.

## Docs follow-up (2026-08-01)

Merged to `master` (branch `ai-agent-mcp-signing`, 2 commits: the server
itself, then a `/console` CTA-page update). Two more docs adds, both
committed straight to `master` since they're copy-only:

- `/console`'s "Connect an AI agent" section now leads with a connector
  config snippet for `/api/mcp` (works for Claude Desktop, Claude Code, any
  MCP client), with the `tools.json` manifest kept underneath as the
  fallback for OpenAI-style function calling / non-MCP frameworks.
  `tools.json`'s own response gained an `mcp_server` field, and its route
  comment no longer claims there's no hosted MCP server.
- `/developers` gained a full "MCP server (for AI agents)" section (between
  Webhooks and Connect via Make): the same config snippet, all six tools
  with descriptions, the agent-triggers/human-still-signs trust note, and a
  pointer to `/console` for the Pro+ metered pricing this rides on.

## Status

Built and merged to `master`, not yet deployed to prod. Docs are done on
both `/console` and `/developers`. Only remaining step: `./deploy-prod.sh`.
