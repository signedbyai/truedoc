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

## Part B — Core outbound webhooks (multi-destination)

**Schema** (new migration): `webhook_endpoints` — **many rows per org**, not
one. `id`, `org_id`, `url text`, `secret text` (per-endpoint, see below),
`enabled boolean default true`, `created_at`, plus a short `label text`
(nullable — "Make: deal sync", "Internal audit log", so a Settings list of
several endpoints is legible instead of a wall of bare URLs).

**Why per-endpoint secrets, not one org-wide secret:** with multiple
destinations, a per-endpoint secret means one leaked/compromised endpoint
(e.g. an old Make scenario nobody uses anymore) doesn't require rotating the
secret for every other destination too — matches how Stripe issues a
distinct signing secret per registered webhook endpoint, not one per
account.

**Why secrets aren't hashed like the API key:** the API key is a credential
*we* verify (org calls us — we only ever need to check a hash). A webhook
secret is the reverse: *we* sign, *the org's* receiving system verifies —
they need to be able to see it to configure their verification step,
indefinitely, the same way Stripe's dashboard always shows a webhook's
signing secret rather than a one-time reveal. Stored in clear text in the
same way `documents.file_path` or any other operational column is — not a
bigger exposure than the URL itself, which the org chose to give us.

**Delivery:** on each of the four trigger events, `POST` to **every enabled
endpoint on that org**, independently — one HTTP call per endpoint, each
signed with that endpoint's own `secret` via `X-SignedBy-Signature:
sha256=<hmac>` (HMAC-SHA256 over the raw body, same pattern Stripe/Resend
use). One endpoint being down or slow must not affect delivery to the
others — dispatched independently (e.g. `Promise.allSettled`, not a
sequential loop that could stall). Fire-and-forget with a short timeout (5s)
and one retry per endpoint after a brief delay; failures logged to
`console.error` only for phase 1, no delivery-log table or retry queue —
matches the proportionate-v1 reasoning already used for bounce tracking
(real infrastructure only once usage shows it's needed, not preemptively).
No new dependency — plain `fetch()`.

**Settings UI implication, now bigger than originally scoped:** a single
URL+secret field becomes a real list — add endpoint, view/copy each
endpoint's secret, enable/disable, remove. Not a large build on its own
(same CRUD shape as `FrequentSignersSettings` already on that page), but
worth naming since it's more UI than the single-field version would've
needed.

Per-endpoint event-type filtering (e.g. "this endpoint only wants
`document.completed`, not all four") is **not** part of this decision — every
enabled endpoint still receives all four trigger events for phase 1. The
schema above happens to make that a natural follow-on (an `events text[]`
column on the same table) if it's wanted later, but it's not being built now.

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
- Per-endpoint event-type subscription filtering (every enabled endpoint
  gets all four trigger events for now — see Part B for why the schema
  still leaves room for this later).
- Per-API-key scopes/permissions, or multiple keys per org (webhooks are
  now multi-destination per the decision below; API keys are not).
- A persistent webhook delivery log / manual-redelivery UI, or a real retry
  queue — fire-and-forget-plus-one-retry per endpoint only, revisit once
  volume shows silent failures are actually a problem.
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
4. **Multi-destination webhook architecture** — `webhook_endpoints` is a
   list per org (many rows), not a single URL/secret pair. Part B above is
   rewritten around this: per-endpoint secrets, independent dispatch per
   endpoint, and a real add/remove/enable list in Settings rather than one
   field. This is a materially bigger build than the single-URL version —
   worth knowing going in, not a surprise mid-build.

## Open questions

None outstanding — ready to build when you give the go-ahead, starting
with multi-signer support per decision #2.

## Beyond Phase 1 — target integration prioritization (2026-07-28)

Requested list, prioritized: **Make, Pipedrive, HubSpot, Airtable, Notion,
Brevo, Folk, CentralStationCRM, Tribe, weclapp, DATEV.** Reasoning below —
this is a scoping/research pass only, nothing here is built or committed to
a phase number yet.

### The central fact that reorders the whole list

Make isn't one item to weigh against the others — once Phase 1 ships, it's
the distribution layer for *most* of the rest of this list, for free.
Confirmed by checking each platform's own current automation-connector
story: HubSpot, Pipedrive, Brevo, Airtable, and Notion (which shipped real
webhook support in January and expanded it in March 2026) are all
already-mature Make/Zapier-connected apps, and Folk ships both a Zapier
connector and its own REST API with webhook subscriptions. A customer on
any of these can wire up SignedBy today, the moment the Phase 1 webhook
ships, by building their own Make scenario — no SignedBy-specific
engineering required for that path to exist. So the real prioritization
question for everything except DATEV isn't "build vs. don't build," it's
"is Make-mediated access good enough indefinitely, or does this one
platform's audience/reach justify a dedicated native app later for a nicer,
directly-listed experience?"

### Tier 1 — served by Make on day one; native app only if volume justifies it later

1. **Pipedrive** — Estonian, EU-based, sales CRM built for small teams and
   solo founders — about as close a match to SignedBy's own customer profile
   (per the Reddit r/freelance / r/consulting / r/SaaS targeting already
   running) as anything on this list, and a natural fit next to the Magic
   Quote feature specifically (quote → CRM deal). Confirmed webhook/app
   platform is mature (webhooks v2, app-scoped webhooks, marketplace apps).
   Ranked above HubSpot despite smaller absolute reach because of audience
   fit and a comparatively lighter certification bar.
2. **HubSpot** — the single biggest reach on this list, and a real developer
   platform, but marketplace-app certification is a heavier lift in 2026
   specifically: OAuth-only apps, a security questionnaire, three installs
   across different accounts before listing, mandatory recertification
   cycles. Worth doing eventually given HubSpot's market share; not a quick
   win, and Make-mediated access covers the gap in the meantime.
3. **Airtable** and **Notion** — not CRMs, but this is exactly how
   SignedBy's actual audience (freelancers/consultants) often run a CRM in
   practice — a database, not a dedicated tool. Both have mature, real
   webhook support now (Airtable's has existed for years; Notion's shipped
   in 2026). Neither needs a "native app" in the marketplace-listing sense —
   this audience self-serves via Make or a direct API call — so the cost
   here is close to zero once Make ships: a couple of example recipes/docs,
   not new SignedBy code.
4. **Brevo** — French/EU, combines CRM + email/marketing automation,
   confirmed real webhook infrastructure across its sales/marketing/
   transactional products. Solid EU-market fit, moderate reach; ranked below
   the above because it's less central to a contract-signing workflow
   specifically (more of a marketing-adjacent tool than a deal-tracking one).
5. **Folk** — small, EU-based (French), aimed at exactly SignedBy's
   freelancer/agency audience. Confirmed to have shipped its own REST API
   with webhook subscriptions in 2025/2026 alongside its existing Zapier
   connector, so it's covered by Make (or even direct API) already. Low
   absolute reach — good audience fit, not worth dedicated engineering yet.
6. **Attio** (added 2026-07-28, not in the original 11) — London-based,
   well-funded ($141M total, $52M Series B led by GV), 5,000+ paying
   customers, fastest-growing of anything on this list. Confirmed to have a
   first-party Make app (`apps.make.com/attio`, not just a Zapier bridge) —
   covered by Phase 1 the same as the rest of this tier — and confirmed to
   have its own internal "Workflows" automation builder with HTTP action
   blocks, meaning a technical Attio customer could call SignedBy's API
   directly from inside Attio itself, no Make required at all. The one real
   caveat: Attio's own positioning ("AI-native CRM for go-to-market
   builders") and customer base (Lovable, Modal, Replicate — funded tech
   startups) skew toward a more sophisticated, better-resourced buyer than
   SignedBy's current beachhead (freelancers/consultants/small business).
   Not a mismatch — funded startups sign plenty of contracts — just a
   different tier than the rest of this list, so it lands in Tier 1 on
   technical merit (mature API/webhooks both directions, self-serve-savvy
   audience) rather than on ICP fit. Worth tracking, not worth a dedicated
   native app ahead of Pipedrive/HubSpot.

### Tier 2 — right audience, too small for dedicated work, confirm Make coverage before assuming it

7. **CentralStationCRM** — German/Cologne, built for small businesses and
   freelancers specifically, a strong ICP match. Confirmed to have a mature
   Zapier presence (8,000-app reach through Zapier); did **not** find
   confirmation of a native Make connector specifically — worth checking
   directly before assuming Make alone covers it, since Zapier and Make
   don't automatically share a connector catalogue.
8. **Tribe** (tribecrm.eu) — a European no-code CRM aimed at SMBs, with its
   own invoicing/quoting feature (a plausible complement to SignedBy's Magic
   Quote). Smaller and newer than the others here; couldn't confirm a
   Zapier or Make connector either way — flagged as unverified rather than
   assumed, given how small/new this product is.

Both belong on the list for ICP fit, not reach — low priority for dedicated
SignedBy-side work regardless, since even a from-scratch integration here
would be cheap (small, modern REST APIs) if it's ever worth doing.

### Tier 3 — genuinely different category, evaluate independently

9. **weclapp** — German cloud ERP/CRM, has a real documented public REST
   API (not certified/gated). More of a full-business-operations tool than
   a CRM, so its user base skews toward established SMEs rather than solo
   freelancers — a plausible "grow into" target if DACH-market traction
   increases, sitting a notch above Tier 2 in seriousness but with no
   confirmed Make/Zapier shortcut, so it would likely need a light, direct
   integration against weclapp's own API rather than relying on Make.
10. **DATEV** — deliberately last, and not because it's low-value: DATEV is
   close to mandatory infrastructure for German tax advisors and a large
   share of German SMEs, so real credibility here could matter a lot in
   that specific market. But it's categorically unlike everything else on
   this list — no Make/Zapier shortcut exists at all, and DATEV's own
   documentation describes two paths: an unaffiliated "DATEV interface
   provider" route (usable, but excluded from marketplace/certification
   benefits) or becoming a certified **DATEV Marketplace Partner**, which
   involves a consultant-guided onboarding and technical certification
   process, not a self-serve API key. This is a multi-month, likely-costed
   undertaking on a different track from the rest of this list — worth
   pursuing only once there's a real, specific demand signal from
   German-accounting-adjacent customers, not as a default "next" step.

### Net recommendation

Ship Phase 1 (Make) first — it's already scoped and, per the above, does
most of the work for 7+ of these 12 platforms immediately. Revisit this
list for a dedicated Phase 2 pick (Pipedrive is the strongest single
candidate) once Make is live and there's real usage data on which
Make-mediated integrations customers are actually building — that data
should inform the next pick more than this analysis alone can.

**Sources checked (2026-07-28):** Notion's 2026 webhook release
(developers.notion.com, fazm.ai), Airtable's webhooks API
(support.airtable.com), Pipedrive's webhooks v2 changelog
(developers.pipedrive.com), HubSpot's 2026 marketplace certification
requirements (developers.hubspot.com), Attio's developer platform and
Make app (docs.attio.com, apps.make.com/attio) and funding/customer
base (eu-startups.com, thesaasnews.com), Brevo's webhooks documentation
(developers.brevo.com), Folk's developer API (developer.folk.app via
breakcold.com/apideck.com summaries), CentralStationCRM's Zapier listing
(zapier.com), weclapp's API docs (weclapp.com/api), DATEV's interface/
partner program pages (datev.de), and Tribe CRM's own site (tribecrm.eu).
