# Make (formerly Integromat) integration — scope

Status: **built**, step 2 of 3 in the CRM-visibility plan (Zapier → Make →
Pipedrive, stop before HubSpot — see project memory
`crm-integrations-plan.md`). Builds on the same REST API v1 as the Zapier
integration (`ZAPIER_INTEGRATION_SCOPE.md`) — no repeated ground covered
here except where Make's model differs enough to matter.

## How Make custom apps actually work (different enough from Zapier to note)

No CLI, no `npm install`, no local `node_modules`. Make apps are built
either in a **web-based Custom Apps Editor** (paste JSON into UI panels —
Base, Connection, Modules, RPCs) or via a VS Code extension for local
editing — either way the underlying format is a set of small JSON
documents (Make calls the language "IML" — the `{{parameters.x}}` /
`{{body.x}}` templating seen below). This is actually **lower setup
friction for Michael than Zapier**: no dev-account npm dance, just log
into the Make web editor and paste each file below into its matching
panel. Source: developers.make.com/custom-apps-documentation.

Files below map directly to what Make's editor calls each piece:
- `base.imljson` — Base URL + default headers for every request (the API
  key attached as `Authorization: Bearer` here, once, so no module repeats
  it).
- `connection/parameters.imljson` + `connection/communication.imljson` —
  the Connection: one password-type field (`apiKey`) and a validation
  request against `GET /templates` (same "works even on an empty account"
  choice made for Zapier, and for the same reason).
- `rpc/list_templates/communication.imljson` — powers the Template
  dropdown on Send Document, Make's equivalent of Zapier's hidden
  `list_templates` trigger.
- `modules/<name>/parameters.imljson` (inputs), `communication.imljson`
  (the actual request), `interface.imljson` (typed outputs available to
  later Make modules) — one triplet per module.

## What's shipping in v1

**Action:** Send Document — wraps `POST /api/v1/documents`, single-signer
only, same v1 scope decision as Zapier and for the identical reason (the
role-numbered signers array doesn't map onto a flat module-field UI without
its own pass — deferred, not v1).

**Search:** Find Document — wraps `GET /api/v1/documents/{id}`, full
signer-status detail, matches the real route response shape exactly
(confirmed by reading the route source, same as Zapier's).

**Polling triggers:** Watch Completed Documents / Watch Declined Documents
— same `GET /api/v1/documents?status=X&limit=100` + client-side re-sort by
`updated_at` workaround as Zapier's, for the same reason (no
`completed_at` field, API's default sort is `created_at`). Kept even
though the instant trigger below exists, because polling needs zero setup
in SignedBy's dashboard — some users will want the simpler path.

**Instant trigger (webhook): New SignedBy Event** — this is the one real
design difference from Zapier, and it's a genuine win, not a compromise.

## The design decision that differs from Zapier: the instant trigger works today, no backend change

Same fact-finding as the Zapier build: `POST /api/org/webhooks` (SignedBy's
only webhook-subscribe endpoint) is gated by `getUserAndOrg()` — dashboard
**session** auth, not API-key auth (confirmed again by re-reading
`src/lib/webhooks.ts` and the route directly for this build). An
API-key-authenticated caller — which is all Zapier or Make ever have —
cannot call it to auto-subscribe.

Zapier has no way around this: a Zapier "REST Hook" trigger *requires*
calling a subscribe/unsubscribe URL itself, so it was stuck on polling for
v1.

**Make's webhook model has a second option Zapier's doesn't: a "not
attached" dedicated webhook**, where the user manually pastes the
Make-generated URL into the target service's own webhook settings UI,
instead of Make calling a subscribe endpoint. SignedBy already has exactly
that UI — the existing Settings webhook-endpoint form that calls
`POST /api/org/webhooks` today, session-authed, already shipped in CRM/MCP
Phase 1. So: Michael creates a Zap— a Make scenario with this trigger, Make
shows a webhook URL, the *user* (SignedBy's customer, not Make) pastes that
URL into their own SignedBy dashboard's existing "Add webhook endpoint"
field, same three-second action anyone already does today to point a
webhook at Zapier's catch hooks or their own server. Zero backend changes
needed. This ships as a real instant trigger in v1, not a fast-follow.

**The tradeoff this creates:** `dispatchWebhookEvent` sends every event
type (`document.viewed/signed/completed/declined`) to every enabled
endpoint — there's no per-event-type filtering at the source (confirmed
again in this build's re-read of `webhooks.ts`). So the module surfaces
all four event types on one trigger; a user who only wants
`document.completed` adds Make's standard built-in Filter after the
trigger. This is normal, expected Make usage — not a workaround.

**Signature verification — flagged, not built.** Every delivery carries
`X-SignedBy-Signature: sha256=<hmac>`. Make's editor likely supports
validating this via an IML hash function on the webhook's validate step,
but I could not get verifiable documentation detail on that specific
mechanic during this build (the docs site's fetch layer returned
unhelpful 404/meta-responses for the relevant pages) — needs confirming
directly in the Make editor, not assumed. Ships unverified for v1, same
trust posture as most first-version webhook integrations; worth tightening
once it's live.

## What I can build vs. what needs Michael

**Built here (JSON, in `signedby-app/integrations/make/`):** base,
connection, the template-list RPC, and all 5 modules (send, find, 2
polling triggers, 1 instant trigger) — every request/response shape
grounded in the real API routes and the real webhook payload shape (read
directly from `webhooks.ts` for this build, not assumed).

**Only Michael can do:**
1. Log into the Make web-based Custom Apps Editor (or VS Code + Apps SDK,
   if preferred) and create a new custom app.
2. Paste each JSON file into its matching panel (Base → `base.imljson`,
   Connection → the two `connection/*.imljson` files, each module → its
   `parameters`/`communication`/`interface` triplet, the RPC into its own
   panel).
3. Verify the polling-trigger dedupe/epoch mechanics and the webhook
   validate-signature option directly in the editor's UI — these are the
   two pieces this build couldn't get fully documented detail on via the
   docs site, flagged rather than guessed.
4. Test end-to-end against a real API key, then submit for the Make app
   directory review (Make's own timeline, outside anyone's control).
