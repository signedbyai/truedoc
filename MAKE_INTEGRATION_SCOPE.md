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

## 2026-08-21 review round (AppBot findings)

A 13-item review (AppBot-derived) of the built modules. 6 items were repo
fixes, already committed to `integrations/make/` on both `master` and
`dev`; 2 items turned out to be already correct (no change needed); the
rest are Make-editor-only settings represented nowhere in these JSON
files — no local file can fix them, so they're written up below as exact
steps for Michael to do directly in the Custom Apps Editor (org 8704380,
app `custom-app-ged4el`).

### Fixed in the repo (already committed, not yet pushed — see below)

1. **Send Document expiry** — now forced to UTC with a literal `Z`, and
   omitted from the request entirely when left blank (was sending an
   ambiguous local-time string, and an empty-string expiry, before).
2. **Watch Completed / Watch Declined — Limit wired up.** Both now respect
   Make's `Limit` field instead of always pulling a fixed page size.
3. **Both watch triggers wrap their trigger date in `parseDate()`**, per
   Make's own custom-app documentation for polling-trigger date fields.
4. **Make an API Call rebuilt as a real Universal (REST) module** — now
   has **Headers** and **Query string** as proper key/value array
   parameters (previously URL/Method/Body only), folded into the request
   via the standard `toCollection(...)` spread-key pattern, plus a
   **Body** field that accepts either a raw JSON string or a mapped
   value. See `modules/api_call/README.md` for the full design writeup.
5. **All module/parameter/interface labels sentence-cased** ("API Key" →
   "API key", "Event Type" → "Event type", "Occurred At" → "Occurred at",
   "Status Code" → "Status code", "Response Body" → "Response body", and
   so on) — verified by grepping every `"label"` field in
   `integrations/make/`.
6. **Uneven Quote/Draft hero-card heights + description font size** (this
   was a dashboard/documents-page fix, not a Make fix, but landed in this
   same session — see the dashboard-mockup work above; not otherwise
   related to this integration).

### Already correct — flagged by AppBot but not actually gaps

- **Connection error fallback.** AppBot's note suggested the connection
  test's error message needed a generic fallback. It already has one,
  just in a different (better) place: `connection/communication.imljson`
  uses a clear, specific static message for the connection test itself
  ("Invalid API key — check Settings → Integration & API..."), and every
  actual module call goes through `base.imljson`'s
  `{{if(body.error, body.error, "Unexpected error from SignedBy.")}}`,
  which already falls back cleanly for any status code. No change made.
- **"Inert" RPC pagination.** AppBot's note (or the underlying gap it was
  pointing at) predates a same-day fix: `GET /api/v1/templates` got real
  `limit`/`offset`/`total`/`has_more` support on 2026-08-19 (see
  `MAKE_APP_REVIEW_FIXES.md`), and `rpc/list_templates/communication.imljson`
  already has the matching `pagination` block (`qs.offset` driven by
  Make's `pagination.page`, `condition: "{{body.has_more}}"`). Confirmed
  by reading the live route source — this is functional, not inert.
  **Still not live**, same caveat as everything else below — see
  `MAKE_APP_REVIEW_FIXES.md`'s "Next step" for the deploy sequence this
  needs.
- **Leftover scaffold / empty attach-detach.** `new_event_webhook` has no
  `communication.imljson` on purpose (it's a "not attached" dedicated
  webhook — see its own `README.md`), not an accidentally-empty
  attach/detach pair. The one genuinely stale comment found —
  `modules/api_call/README.md` still described the pre-rebuild
  URL/Method/Body-only version — has been rewritten to match the current
  Headers/Query-string/Body-as-`any` design (fix #4 above).

### Editor-only — needs Michael, exact steps below

**#3 — Find Document: change module Type from Search to Action.**
Find Document does a single-ID `GET` and returns exactly one document —
that's Action semantics (perform an operation, return one bundle), not
Search semantics (look up records matching filter criteria, potentially
zero-or-more). In the editor: Modules → Find Document → General/Settings
→ change **Type** from `Search` to `Action`. No JSON changes needed —
`parameters.imljson`/`communication.imljson`/`interface.imljson` stay
exactly as they are.

**#5 — New SignedBy Event: description + setup instructions.**
Paste into the module's Description field:
> Triggers instantly when a document is viewed, signed, completed, or
> declined. Copy the webhook URL below and paste it into your SignedBy
> dashboard to activate it.

Paste into the module's Setup Instructions field:
> 1. Add this trigger to your scenario — Make will generate a unique
>    webhook URL for it.
> 2. Copy that URL.
> 3. In SignedBy, go to Settings → Integration & API → Webhooks, and
>    paste the URL into "Add webhook endpoint."
> 4. Save. SignedBy will now send every document event (viewed, signed,
>    completed, declined) to this scenario.
> 5. Only want one event type? Add Make's built-in Filter right after
>    this module (e.g. "only continue when Event type = document.completed").
> 6. SignedBy shows a signing secret once, when you add the endpoint —
>    save it if you plan to verify the `X-SignedBy-Signature` header.

**#7 — Sample data for the trigger/search modules.** Paste each into that
module's Sample Data / "Set sample data" panel:

Find Document:
```json
{
  "id": "3f9c2e1a-4b7d-4e2f-9c1a-000000000001",
  "title": "Sample Agreement",
  "status": "completed",
  "created_at": "2026-08-15T09:00:00.000Z",
  "updated_at": "2026-08-18T10:15:00.000Z",
  "expires_at": null,
  "signers": [
    {
      "email": "signer@example.com",
      "name": "Jamie Rivera",
      "status": "signed",
      "signed_at": "2026-08-18T10:15:00.000Z",
      "auth_required": false,
      "auth_verified": false
    }
  ]
}
```

Watch Completed Documents (Watch Declined Documents is identical with
`"status": "declined"`):
```json
{
  "id": "3f9c2e1a-4b7d-4e2f-9c1a-000000000001",
  "title": "Sample Agreement",
  "status": "completed",
  "created_at": "2026-08-15T09:00:00.000Z",
  "updated_at": "2026-08-18T10:15:00.000Z",
  "expires_at": null
}
```

New SignedBy Event:
```json
{
  "event": "document.completed",
  "occurred_at": "2026-08-18T10:15:00.000Z",
  "document_id": "3f9c2e1a-4b7d-4e2f-9c1a-000000000001",
  "title": "Sample Agreement",
  "status": "completed"
}
```
(`signer` is present on `document.viewed`/`document.signed`/
`document.declined`, omitted on `document.completed` — see
`modules/new_event_webhook/README.md`.)

**#8 — Confirm the `listTemplates` RPC has the SignedBy connection
declared.** In the editor: RPCs → listTemplates → confirm the Connection
dropdown is set to the SignedBy connection (not blank). If it's blank,
the Template dropdown on Send Document will fail to authenticate even
though the connection itself works everywhere else. Note-only, no content
to paste — just a check.

**#11 — Move modules out of a single "Other" group.** In the editor,
Modules → each module → Group field:
- **Documents:** Send Document, Find Document
- **Triggers:** Watch Completed Documents, Watch Declined Documents, New
  SignedBy Event
- **Other:** Make an API Call (this one genuinely belongs in a
  catch-all/advanced group, being the generic REST escape hatch — leaving
  it in "Other" is correct, not a leftover default)

### Still open from the original build (unchanged, see MAKE_APP_REVIEW_FIXES.md)

- Test scenarios per module + one error-handling scenario need rebuilding
  in the editor (the ones used to verify the original 5 modules were
  deleted afterward).
- Module-level metadata (name/description/icon) — separate from #5 above,
  which is only the webhook trigger — still worth a full pass across all
  6 modules.

### Not yet pushed

Nothing from this review round (or the 2026-08-19
`MAKE_APP_REVIEW_FIXES.md` round before it) has been pushed to `origin` —
this sandbox has no network access for `git push`
([[sandbox-no-git-push-credentials]]). Everything is committed locally on
both `master` (`11b81e5`... — hero-card fix; Make fixes are the commits
just before it) and `dev`. Needs a push from Michael's own machine before
any of this — including the `/api/v1/templates` pagination backend
change — is actually live.
