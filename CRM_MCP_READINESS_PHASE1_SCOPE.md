# CRM/middleware readiness — Phase 1 scope

Status: **scoping, decisions locked in, not built yet**. Four asks: close the
current v1 API's real gaps, build core outbound webhooks, expose a few core
event triggers, and connect the API to Make (EU-based, GDPR-friendly no-code
middleware, the explicit target rather than Zapier). Build order decided in
"Decisions" below: multi-signer support first — say the word when ready to
start.

One naming note: "MCP" here is confirmed to mean **m**iddleware **c**onnector
**p**latform (Make, and by extension Zapier-style tools), not Anthropic's
Model Context Protocol — everything below is REST + webhooks, not an MCP
server.

## What exists today

- `/api/v1/documents` (`POST`) — create a document from a template + send to
  **one** signer. `/api/v1/documents/[id]` (`GET`) — status + signers list.
  That's the entire public API. Read both routes in full.
- Auth: `authenticateApiRequest()` (`lib/api-auth.ts`) — single bearer API
  key per org (`sb_live_...`, SHA-256 hashed, `Authorization: Bearer` or
  `x-api-key` header), gated to the **Business** plan via `planHasFeature`.
  No scopes, no per-key names, no rotation history — one key, full access,
  matches the existing Settings "Integration & API" card exactly.
- Internal event log already exists and already covers the document
  lifecycle: `audit_events` (`event_type` check constraint currently allows
  `created, sent, viewed, consent_given, signed, declined, completed,
  voided, payment_link_clicked, docgate_clicked, recipient_corrected,
  expired, identity_verified`). This is the natural source to hang outbound
  webhooks off — the data already exists, just not relayed anywhere.
- No outbound webhook capability exists anywhere in the codebase today
  (grepped) — the only webhooks in this app are *inbound* (Stripe, Resend).
- No `webhook_endpoints`-style table, no HMAC signing helper, no dispatch
  queue.

## Part A — Close the real API gaps

Ranked by what actually blocks a usable CRM/Make integration, not just
"more endpoints for their own sake":

1. **`GET /api/v1/documents`** — list/search the org's documents (status
   filter, pagination). Today a Make scenario has no way to poll "what's
   changed" or let a user browse existing documents from inside a Make
   dropdown — everything has to be tracked by an id Make stored itself at
   creation time. Real gap.
2. **`GET /api/v1/templates`** — list the org's templates (id + name). Needed
   so a Make/CRM user configuring a "create document" action gets a real
   dropdown of template names instead of having to go copy a UUID out of the
   SignedBy dashboard by hand. Without this, the integration is technically
   possible but unpleasant enough that people won't actually use it.
3. **`GET /api/v1/documents/[id]/signed-file`** — download the completed PDF
   via API key auth. Today the only signed-file routes are dashboard-session-
   gated (`/api/documents/[id]/signed-file`) or signer-token-gated
   (`/api/sign/[token]/signed-file`) — neither works from a server-side Make
   scenario. This is the single most valuable gap to close: "when a quote is
   signed, attach the PDF to the CRM deal" is the headline use case for this
   whole phase, and it's currently impossible via API.
4. **Multi-signer support on `POST /api/v1/documents`.** The route accepts
   exactly one `signer` object and hardcodes `signer_id: null` on every
   placed field (nothing assigns fields to a role). Any template built for
   2+ parties (buyer+seller, both company signatories) can't actually be
   used through the API today — only single-signer templates work. Given
   how common multi-party contracts are in CRM workflows specifically, this
   is a real gap, not a nice-to-have. Proposed: accept `signers: [{ role,
   name, email }]` keyed by the same `role` numbers already on
   `template.field_map`, reusing the exact role-matching logic
   `templates/[id]/bulk-send` already has for the dashboard bulk-send
   feature — this is porting existing logic to the API, not inventing new
   logic.
5. **`POST /api/v1/documents/[id]/void`** — cancel a sent document via API.
   Smaller gap; only matters for "deal fell through, kill the pending
   contract" automations. Cheap to add alongside the others.

Not proposing "create from an arbitrary uploaded PDF" via API for this
phase — that's a materially bigger feature (upload handling, then either
field placement via API or an AI-suggest call) and every CRM/e-sign
integration convention (Zapier's DocuSign/PandaDoc apps included) is
template-based for exactly this reason. Worth a future phase, not this one.

## Part B — Core outbound webhooks

**Schema** (new migration): `webhook_endpoints` — `org_id` (one row per org,
same one-per-org shape as the existing API key, not a list), `url text`,
`secret text` (see note below on why this one is stored differently from the
API key), `enabled boolean default true`, `created_at`.

**Why the secret isn't hashed like the API key:** the API key is a
credential *we* verify (org calls us — we only ever need to check a hash).
A webhook secret is the reverse: *we* sign, *the org's* receiving system
verifies — they need to be able to see the secret to configure their
verification step, indefinitely, the same way Stripe's dashboard always
shows your webhook signing secret rather than a one-time reveal. Stored in
clear text in the same way `documents.file_path` or any other operational
column is — not a bigger exposure than the URL itself, which the org chose
to give us.

**Delivery:** `POST` to the stored URL, JSON body, header
`X-SignedBy-Signature: sha256=<hmac>` (HMAC-SHA256 over the raw body using
`secret`, same pattern Stripe/Resend use, so any platform that *does* verify
signatures — not just Make — can). Fire-and-forget with a short timeout (5s)
and one retry after a brief delay; failures logged to `console.error` only
for phase 1, no delivery-log table or retry queue — matches the proportionate-
v1 reasoning already used for bounce tracking (real infrastructure only once
usage shows it's needed, not preemptively). No new dependency — plain
`fetch()`, nothing else in this codebase does outbound webhooks yet but
nothing exotic is needed for a single POST.

**Where dispatch gets called from:** directly at the four existing
`audit_events` insert sites for the event types below (submit/route.ts ×2,
decline/route.ts, sign/[token]/route.ts), not through a refactor of every
`audit_events.insert()` call site in the app into a shared helper — that
would touch far more files (viewed/sent events are inserted from several
places) for no benefit this phase, since only a handful of event types
actually need to leave the building.

## Part C — Which event triggers, and their payloads

Four, matching "a few core triggers," chosen for what a CRM genuinely can't
know without being told:

- **`document.viewed`** — signer opened the document. Useful for a sales rep
  follow-up trigger ("they opened it, nudge them").
- **`document.signed`** — one signer completed their part (multi-party deals
  care about this before the whole thing is done).
- **`document.completed`** — every signer finished. The main one — "mark
  deal closed-won," "attach signed PDF" (now possible via Part A #3).
- **`document.declined`** — a signer declined. "Alert the rep, reopen the
  deal."

Not proposing `document.created`/`document.sent` as webhook triggers — those
happen synchronously inside the same Make scenario that just called
`POST /api/v1/documents`, so Make already knows; a webhook for something the
caller just did themselves adds nothing.

Payload shape, consistent across all four:

```json
{
  "event": "document.completed",
  "document_id": "…",
  "title": "…",
  "status": "completed",
  "signer": { "email": "…", "name": "…" },
  "occurred_at": "2026-07-28T…Z"
}
```

(`signer` omitted for `document.completed`, which isn't about one signer.)

## Part D — Connecting to Make specifically

Two directions, and they're not symmetric in effort:

**SignedBy → Make (the webhook trigger side, Part B/C above).** This is the
whole job — Make's "Custom Webhook" trigger module accepts any POST URL with
a JSON body natively, no SignedBy-specific app needed on Make's side. An org
pastes the URL Make gives them into a SignedBy settings field; done.

**Make → SignedBy (Make calling our API as an action step).** Works **today,
with zero new code**, via Make's generic "HTTP — Make a request" module,
using the existing API key as an `Authorization: Bearer` header. Part A's
gap-closing (list templates, multi-signer, void, signed-file download) makes
that generic-HTTP path actually pleasant to configure instead of technically-
possible-but-painful — it doesn't require a "real" integration to unlock.

**Not in this phase: a native SignedBy app published in Make's app
marketplace** (a proper app with typed dropdowns/fields instead of raw JSON,
built via Make's app builder, submitted for their review, maintained
ongoing). That's a meaningfully bigger, separate undertaking with its own
approval process outside this codebase — worth a later phase once real usage
through the generic-HTTP path shows it's worth the investment, not before.

**EU-friendly framing, confirmed:** Make (Celonis/Integromat) is
Prague-headquartered, which is the actual reason it fits better than Zapier
(US) for a Netherlands-established company's sub-processor list — same
category of reasoning as the OSS/GDPR framing in the legal-pages work
already done for other vendors.

**One legal-pages note, different in kind from past vendor additions:**
unlike adding e.g. Resend or Trustpilot (SignedBy's own choice to route data
through a new vendor), a customer-configured webhook URL is *the customer's
own* choice of where to send *their own* document metadata — much closer to
"here's an API, what you build with it is on you" than "SignedBy adopted a
new sub-processor." Recommend a short line in the API docs / terms noting
the customer is responsible for the security and compliance of any endpoint
they configure, rather than adding Make to `/privacy`'s sub-processor list —
worth confirming that reasoning holds before shipping, not just asserting it.

## Explicitly out of scope for Phase 1

- A native Make (or Zapier) app in either marketplace.
- A real MCP (Model Context Protocol) server — genuinely different work if
  that's actually what's wanted; see the open question below.
- Multiple webhook URLs per org, or per-event subscription filtering (all
  four events go to the one configured URL for now).
- Per-API-key scopes/permissions, or multiple keys per org.
- A persistent webhook delivery log / manual-redelivery UI, or a real retry
  queue — fire-and-forget-plus-one-retry only, revisit once volume shows
  silent failures are actually a problem.
- Creating documents from an arbitrary uploaded PDF via API (template-based
  only, per Part A's reasoning).

## Decisions (2026-07-28)

1. "MCP" = middleware/connector platform reading confirmed — this is a
   REST + webhooks scope, not a Model Context Protocol server.
2. **Build order: multi-signer support (Part A #4) first**, ahead of the
   smaller API gaps and the webhook work.
3. **Webhook secret is always visible/re-copyable in Settings**, not a
   one-time reveal like the API key — matches the reasoning in Part B (the
   org needs to keep referencing it whenever they reconfigure Make).
4. **Not yet decided:** one webhook URL per org vs. supporting several
   simultaneous destinations. Left open — the one-URL shape in Part B is
   still just the phase-1 default until this is settled, not a final call.

## Open questions

None blocking a build decision, other than #4 above if it turns out to
matter before webhooks are built.
