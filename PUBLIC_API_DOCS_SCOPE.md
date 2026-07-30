# Public API docs — scope

Prompted by a direct question (2026-07-30): is there value in a public,
any-tier-readable page documenting the SignedBy API, and where should it
live. Scoping only — nothing here is built yet.

## What exists today

- The only API documentation is inline in the dashboard's Settings page
  (`src/app/dashboard/settings/page.tsx`), inside the "Integration & API"
  card — and it's **fully gated**. A non-Business user sees exactly one
  line: *"API access is available on the Business plan."* No endpoint list,
  no request/response shapes, no webhook payloads. Nothing.
- For a Business user, the card shows curl examples for: create & send
  (single + multi-party), check status, list documents/templates,
  download signed-file, void, expiration + auth_required, custom invite
  subject/message, plus a Webhooks CRUD widget. Requests only — **no
  response JSON is shown anywhere, for any endpoint.**
- The `/vs/*` comparison pages (docusign, signnow, pandadoc, bolosign, hix)
  now each have a row comparing API/webhook access, all pointing at the
  same fact: SignedBy includes this in the $29/mo Business plan, where
  every competitor either excludes it from standard plans entirely or
  charges materially more for it. None of those rows link anywhere —
  there's no public page to send a curious reader to.

## Why this is worth doing

A prospective customer deciding whether SignedBy's API/webhooks fit their
Make or CRM workflow currently has to pay for Business first to find out
what they'd be buying. That's backwards for a self-serve product — Stripe,
Twilio, and Make itself all publish full API docs regardless of plan; the
actual gate is "you need a key to call it," not "you need to pay to read
about it." A public docs page:

- Gives the vs-page comparison rows somewhere to send a reader — right now
  they're a dead end.
- Is a real, if modest, SEO surface (same logic as `/templates` and
  `/vs/*` already doing that job) — targets developer-intent searches
  ("SignedBy API", "SignedBy webhooks") the current gated setup can't
  capture at all, since search engines can't index a page that says
  nothing.
- Lets a technical evaluator self-serve the whole decision before ever
  signing up, which is exactly the audience (freelancers/consultants
  wiring up their own Make scenario) this product targets.

## Proposed page

**One page, `/developers`** (not a docs subsite with its own nav) — matches
this codebase's existing pattern of one flat, single-scroll page per topic
(`/templates`, `/vs/*`, `/magic-quote`), rather than introducing a new
information architecture for a single page's worth of content. Anchor
sections rather than sub-pages; can split out later (e.g. a dedicated
`/developers/pipedrive` page) if a specific how-to earns its own SEO
target, not before.

Sections, roughly in order:

1. **Hero** — "Build on SignedBy" / one-line pitch, sign-up CTA. Same
   header/footer chrome as the vs pages for consistency.
2. **Quick facts strip** — included in Business ($29/mo), REST + webhooks,
   no separate metered developer plan (the exact contrast the vs pages
   already establish against DocuSign/SignNow/PandaDoc).
3. **Authentication** — bearer API key, where to generate one (dashboard
   Settings, Business tier). Explained conceptually even for a visitor
   without a key yet, with an inline "Upgrade to Business to get yours" CTA.
4. **Endpoint reference** — expands what's in Settings today, but adds the
   thing that's currently missing everywhere: **response JSON for every
   endpoint**, not just requests. Covers: create & send (single +
   multi-party, `expires_at`, `auth_required`, `invite_subject`/
   `invite_message`), list documents, list templates, get document status,
   download signed-file, void.
5. **Webhooks** — event types (`document.viewed/signed/completed/
   declined`), full payload shape, HMAC signature verification
   (`X-SignedBy-Signature: sha256=...`) with a real verification code
   snippet (Node crypto), retry behavior (one retry, no persistent queue —
   stated plainly, same transparency Stripe gives its own retry policy).
6. **Rate limits** — the existing 60/hour create-document limit, stated so
   an integrator isn't surprised by a 429 mid-build.
7. **Connect via Make** — the generic path from
   `CRM_MCP_READINESS_PHASE1_SCOPE.md` Part D: SignedBy → Make via Custom
   Webhook trigger (paste the URL, nothing to build), Make → SignedBy via
   the generic HTTP module + bearer key. No native app exists yet — stated
   honestly, not implied.
8. **How-to: Pipedrive** (see below) — one concrete, fully worked example
   instead of a generic "and it works with everything" claim.
9. **FAQ/gotchas** — `expires_at` must be a UTC ISO-8601 string ending in
   `Z` (came up directly in testing this week), no sandbox/test-mode
   distinction (the free tier's 3 docs/month covers early testing),
   multi-party `role` numbering.
10. **Footer CTA** — "Ready to build? Upgrade to Business."

## Why Pipedrive for the featured how-to

`CRM_MCP_READINESS_PHASE1_SCOPE.md`'s own Part D research already ranked
Pipedrive above HubSpot for SignedBy specifically — smaller absolute reach,
but "about as close a match to SignedBy's own customer profile... as
anything on this list," and a natural pairing with Magic Quote (quote →
signed → deal). Reusing that reasoning here rather than re-deciding it.
Confirmed via a quick check that Make's Pipedrive connector has real,
current modules for this: a "Creates a Deal" action and both a generic
"Webhook receives data" trigger and Pipedrive's own native triggers
(Pipedrive ships real Webhooks v2 on its own API too, not just via Make).

Proposed walkthrough, both directions in one worked example:

- **Pipedrive → SignedBy**: a Make scenario watching for a deal entering a
  chosen stage (e.g. "Contract sent") calls `POST /api/v1/documents`
  (generic HTTP module + bearer key) to create and send the contract from
  a template, with the deal's contact as the signer.
- **SignedBy → Pipedrive**: the `document.completed` webhook fires into a
  Make Custom Webhook trigger, which then calls Pipedrive's "Update a
  Deal" or "Create a Note" module to log that the contract came back
  signed — the exact "attach the signed PDF to a CRM deal" headline use
  case Part B of the CRM scope doc was written around.

This doubles as a template Michael can screenshot/adapt for a second CRM
later (HubSpot, Airtable, Attio) without redoing the research.

## Where it's linked from

- Homepage footer, alongside "Free templates" / "Pricing" (currently the
  only two links there besides Terms/Privacy).
- Every `/vs/*` page's footer link list (same set already repeated across
  all five).
- `/pricing`, near the Business tier's feature list.
- Settings page: when `hasApiAccess` is false, the single gated line
  becomes "API access is available on the Business plan. See what's
  possible in the docs →" instead of a dead end.

## Legal note

Naming Pipedrive and Make by name in a factual how-to is the same
nominative-fair-use posture the `/vs/*` pages already use for DocuSign/
SignNow/PandaDoc/BoloSign/Hix — add the same disclaimer pattern ("Pipedrive
is a trademark of its respective owner; SignedBy is not affiliated with or
endorsed by Pipedrive").

## Effort note

Most of the endpoint-reference content already exists as curl examples in
Settings — genuinely new work is: response JSON for each endpoint (need to
write these accurately off the real route code, not invented), the
webhook/HMAC verification section (partially exists as code comments, not
prose), the Pipedrive how-to (net new), and adding the nav link to ~8
files (5 vs pages + homepage + pricing + Settings). Proportionate — this
is a documentation/copy task, not new application code; no migrations, no
new API behavior.

## Open questions

None outstanding — ready to build when you give the go-ahead.
