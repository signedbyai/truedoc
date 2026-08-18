# Zapier integration — scope

Status: **building now**, per direct instruction ("let's follow this plan, go
step by step"). This is step 1 of the CRM-visibility plan (Zapier → Make →
Pipedrive, stop before HubSpot). One real design decision below has a
default chosen for v1 — flagged clearly rather than silently picked.

## What this builds on

Everything needed already exists from CRM/MCP Phase 1
(`CRM_MCP_READINESS_PHASE1_SCOPE.md`) and API_TIER_SCOPE.md: `POST /api/v1/documents`
(create + send), `GET /api/v1/documents` (list/filter by status),
`GET /api/v1/templates` (list, for dropdowns), outbound webhooks
(`document.viewed/signed/completed/declined`), all authenticated via a
single org API key through `authenticateApiRequest()`.

## The one real design decision: polling vs. REST Hooks

Zapier triggers can work two ways:

- **Polling** — Zapier calls a `GET` endpoint on a schedule (as fast as every
  1–15 min depending on the end user's Zapier plan) and diffs the results
  itself. Zero backend changes needed — it can run against
  `GET /api/v1/documents` exactly as it exists today.
- **REST Hooks** — Zapier calls a subscribe URL once when a user turns a Zap
  on, SignedBy pushes events to it in real time, Zapier calls an unsubscribe
  URL when the Zap turns off. Instant instead of poll-delayed, but I checked
  `POST /api/org/webhooks` (the only subscribe endpoint that exists) and it's
  gated by `getUserAndOrg()` — dashboard **session** auth, not the API-key
  auth (`authenticateApiRequest()`) Zapier would actually be calling with.
  Zapier can't hold a session cookie, so it cannot call this endpoint as-is.
  Making REST Hooks work means widening `/api/org/webhooks` to accept API-key
  auth too (same pattern as the `apiAccess||consoleAccess` widening
  API_TIER_SCOPE.md already did elsewhere), or adding a parallel
  API-key-authed subscribe endpoint — a real backend change, not just an
  integration-side build.

**v1 decision: polling.** Ships against exactly what's live today, zero
backend risk, matches Zapier's own general guidance for a first version
("polling is fine, ship it" — the same conclusion the one real-world
solo-SaaS Zapier integration write-up I found landed on). REST Hooks are a
clean fast-follow once there's evidence people actually want faster-than-
a-few-minutes triggers — flagged here, not built now.

**Real limitation this creates:** `GET /api/v1/documents` only exposes
document-level `status` (`draft/sent/completed/declined/voided`), not the
per-signer `viewed`/`signed` sub-events the webhook system has. So polling
triggers can cleanly cover "document completed" and "document declined" (a
status transition), but **not** "document viewed" or an individual signer
finishing their part on a multi-party document — those only exist as
webhook events today. Judged an acceptable v1 gap: "contract fully signed"
and "contract declined" are the two events most CRM automations actually
key off (e.g. "move deal to Closed Won when the contract completes").

## What's shipping in v1

**Triggers** (polling, against `GET /api/v1/documents?status=X`):
- New Document Completed
- New Document Declined

**Actions:**
- **Send Document** — wraps `POST /api/v1/documents`, single-signer path
  only for v1 (matches the "headline use case" already documented on
  `/developers`: deal reaches a stage → contract goes out). Multi-party
  send is a fast-follow, not v1 — the input shape (role-numbered signer
  array) doesn't map cleanly onto Zapier's flat action-field UI without
  a dedicated multi-row field type, worth its own pass.
  Template selection is a **dynamic dropdown** sourced from a hidden
  `list_templates` trigger wrapping `GET /api/v1/templates` — so the user
  picks a real template name in the Zap editor, never touches a raw UUID.

**Search action:**
- **Find Document** — wraps `GET /api/v1/documents` filtered by id/status,
  for "look this up mid-Zap" use cases (e.g. check a document's status
  before deciding what to do next).

**Auth:** Custom auth, API key as `Authorization: Bearer` header (matches
`extractApiKey()` in `lib/api-key.ts` exactly). Test request hits
`GET /api/v1/templates` — works even for an org with zero templates yet, so
"is this key valid" never false-negatives on an empty account.

## Scaling note, not a blocker

`GET /api/v1/documents` and `/templates` are both rate-limited at
120 requests/hour per org (`checkRateLimit`, added 2026-08-12). A single
Zap polling every minute is 60 calls/hour on its own; an org running
several polling Zaps simultaneously could approach that ceiling. Not a
reason to hold v1 back — just worth knowing before assuming REST Hooks are
purely a "nice to have, someday" item; if usage shows people running
multiple Zaps per org, that's the point Hooks stop being optional.

## What I can build vs. what needs Michael

**Built here (code, in `signedby-app/integrations/zapier/`):** the full
Zapier Platform CLI app — `package.json`, `index.js`, authentication
config, both triggers, the hidden template-list trigger, the create
action, and the search action.

**Only Michael can do:**
1. Create a Zapier developer account (free) and run `zapier login`.
2. `cd integrations/zapier && npm install` (needs network — can't be done
   through the device bridge, no internet access there).
3. `zapier register "SignedBy"` to reserve the integration.
4. `zapier push` to upload a version, then test it end-to-end against a
   real API key in the Zapier UI.
5. Submit for the public app directory — Zapier's own review process,
   outside anyone's control on timing (typically takes real days-to-weeks
   once submitted, per Zapier's published developer docs).
