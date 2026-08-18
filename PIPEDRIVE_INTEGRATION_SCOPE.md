# Pipedrive integration — scope

Status: **built**, step 3 of 3 in the CRM-visibility plan (Zapier → Make →
Pipedrive, **stop here** — per direct instruction, no HubSpot work follows
this without a fresh go-ahead).

## The real finding: most of "Pipedrive integration" needs zero new code

Unlike Zapier and Make, Pipedrive isn't a platform SignedBy needs to build
*modules* for to get useful, working automation today. Two things are
already true:

1. **Pipedrive → SignedBy** (e.g. "send the contract when a deal hits
   Proposal stage") is coverable by Pipedrive's own built-in **Automations**
   feature — no Zapier, no Make, no new SignedBy code. Automations can fire
   a `POST`/`PUT`/`DELETE` "webhook request" action with a custom JSON body
   (Pipedrive's own field-placeholder builder or raw JSON) and authentication
   credentials, triggered off native Pipedrive events (deal stage changed,
   deal created, etc.). That request can go straight at SignedBy's existing
   `POST /api/v1/documents`, same API-key auth as everything else. Recipe
   below.
2. **SignedBy → Pipedrive** (e.g. "move the deal to Closed Won when the
   contract completes") is already fully covered by the **Make integration
   just built** — Make has a native, first-party Pipedrive connector, so a
   Make scenario chaining this build's `New SignedBy Event` instant trigger
   into Make's own "Update a Deal" Pipedrive module needs zero SignedBy-side
   Pipedrive code either. Recipe below.

So the two most valuable flows ship today as **configuration recipes**, not
new source files — genuinely less work than Zapier or Make, and immediately
usable without waiting on any review/approval process (unlike both of those,
which need their respective app-store review).

## Recipe 1 — Pipedrive Automation → Send Document

In Pipedrive: Automations → New Automation.
- **Trigger:** Deal → stage is changed → to \<your "Contract sent" stage\>
  (or whichever stage should trigger a send).
- **Action:** Webhook request.
  - Method: `POST`
  - URL: `https://signedby.ai/api/v1/documents`
  - Authentication: Bearer token → the org's SignedBy API key (Settings →
    Integration & API).
  - Body (raw JSON):
    ```json
    {
      "template_id": "<your SignedBy template ID>",
      "signer": {
        "email": "{{person.email}}",
        "name": "{{person.name}}"
      }
    }
    ```

**Real gap this surfaces, worth Michael knowing about (not a Pipedrive
limitation — a SignedBy one):** Pipedrive's automation builder has no way to
call SignedBy's dynamic-dropdown RPC the way Zapier/Make do, so
`template_id` has to be hardcoded per-automation, and finding that ID today
means going to find it manually — `GET /api/v1/templates` returns it, but
there's no copy-paste-friendly place in the dashboard UI to grab a
template's ID next to its name. **Possible small product fix, not built
here without confirmation:** show template IDs (with a copy button) on the
Templates page, or in Settings → Integration & API — a two-minute UX
improvement that would make this recipe (and anyone else's raw API usage)
meaningfully less annoying. Flagging, not building, since it's outside this
CRM-plan scope.

## Recipe 2 — SignedBy event → Update Pipedrive Deal

Uses the Make integration built in this same plan
(`signedby-app/integrations/make/`, see `MAKE_INTEGRATION_SCOPE.md`).

In Make: new scenario.
- **Module 1 (trigger):** SignedBy → New SignedBy Event (the instant
  trigger built in this plan). Add a Filter after it: `event = document.completed`.
- **Module 2 (action):** Pipedrive → Update a Deal (Make's own native
  Pipedrive module, already exists in Make's app library, not built by
  this plan). Map the deal by whatever identifier the org tracks (e.g. a
  Pipedrive deal ID stored as a custom field on the SignedBy document title,
  or matched by signer email against the deal's linked person) and set
  stage to Closed Won (or whatever the org wants).

This recipe is the practical reason Make was worth building before
Pipedrive specifically — it's what makes this flow free.

## What's NOT built: the Pipedrive Marketplace app (discovery/listing)

The two recipes above cover the *automation* value (what actually moves
deals and sends contracts) but not the *discovery* value from the original
question ("high-visibility CRM integrations that attract subscribers") —
being listed in Pipedrive's own Marketplace, found by Pipedrive users
browsing for a signing tool, the same kind of visibility Zapier/Make's app
directories provide once those are approved.

That requires a real Pipedrive Marketplace app: OAuth 2.0 (Pipedrive users
install it and grant scoped access, not an API-key paste), plus at least
one App Extension (a hosted panel or custom modal iframed into Pipedrive's
UI, e.g. "Document status" shown on a deal). This is a materially bigger
build than either Zapier or Make ended up being — it needs:
- A new `pipedrive_connections` table (per-org OAuth access/refresh tokens,
  something neither Zapier nor Make needed since they use SignedBy's own
  API keys, not an OAuth grant SignedBy has to store and refresh).
- New hosted routes to serve the panel/modal content inside Pipedrive's
  iframe (CSP `frame-ancestors` changes to allow `app.pipedrive.com`).
- Pipedrive's own OAuth callback + token refresh handling.

Not started, and shouldn't be without a separate go/no-go — same posture
as the REST-Hook auth-widening flagged (not built) in the Zapier scope, and
the signature-verification gap flagged (not built) in the Make scope. If
Marketplace-listing visibility turns out to matter after Zapier/Make usage
data comes in, this is the next real decision, not a small follow-up.

## What only Michael needs to do

Nothing to push or register — both recipes are pure configuration inside
Pipedrive's and Make's own UIs, using API surfaces that already exist and
are already live in production. Set up Recipe 1 in any org's Pipedrive
account to test it; Recipe 2 needs the Make app from step 2 actually
pushed/tested first.
