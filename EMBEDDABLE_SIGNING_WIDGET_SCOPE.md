# Embeddable SignedBy Widget — Scope

**Status:** Scoping only — nothing built. Written 2026-08-22; Phase 1
shape locked 2026-08-24. Michael: "having the ability to embed signedby
in websites similar to the way calendly works could be good to also
explore." Confirmed via codebase search: no existing embed/iframe/widget
feature or prior scope doc for this — genuinely new ground for SignedBy.

## The Calendly analogy, made concrete

Calendly's core embed pattern: a business drops a snippet on their own
site, and a visitor books a meeting without leaving that site or creating
a Calendly account first. The SignedBy-shaped equivalent: a business
embeds a signing entry point directly into their own site — e.g. a
services agency embeds "Sign your engagement letter" inline on their
proposal page — without sending the counterparty to a separate
signedby.ai tab to start the interaction.

## Competitive landscape (2026-08-22 research, deepened 2026-08-24)

Embedding e-signature flows isn't novel in this market — PandaDoc,
SignNow, and Adobe Sign all have [Embedded
Signing](https://www.pandadoc.com/developer-api/embedded-signing/)-style
API products aimed at developers with backend access (session tokens,
webhooks, real integration work on the customer's side).

Two players ship an actual no-code, Calendly-shaped version — and
**2026-08-24 deep dive confirms both of them sign inline, not by email:**

- **BoldSign's** [no-code
  widget](https://boldsign.com/blogs/embed-esignature-no-code-integration/):
  site owner creates a "bulk link" in-dashboard (no API key, no code),
  copies an iframe snippet into their site. The visitor fills name/email,
  optionally does inline email verification, accepts terms, and **signs
  immediately inside the iframe** — no context switch. Only after signing
  does BoldSign email them a copy (a receipt, not a "click to sign"
  link). One bulk link spins off an individually-tracked signed document
  per visitor.
- **Adobe Acrobat Sign's** ["Web
  Forms"](https://helpx.adobe.com/sign/web/advanced-users/webforms/create.html):
  same shape — dashboard-configured, no API key, embeddable via script
  tag/iframe/link, visitor fills and signs inline, a new agreement record
  per submission.

So the two real competitors both accepted the harder, riskier build
(inline signing inside a third-party iframe) because "sign right here,
no context switch" is the actual product promise of this category.
**Decision below is to deliberately NOT match that for v1** — see Phase
1/2 split.

## Decisions — Michael, 2026-08-22 (shape) and 2026-08-24 (Phase 1 flow)

- **No-code / URL-based direction confirmed** (08-22) — not the
  developer-API pattern.
- **What's embedded: a user-created template**, not a generic intake
  (08-22) — sender builds/saves a template first
  ([[free-tier-one-template-scope]], [[template-browse-scope]]); the
  embed points at that specific template.
- **URL scheme: `{workspace short name}/{template short name}`** (08-22)
  — the Calendly analogue of `calendly.com/{username}/{event-type}`.
- **Not gated to any subscription tier** (08-22) — free on every plan.
- **Phase 1 flow: email-mediated request, not inline signing (08-24).**
  Discussed both real-world models (BoldSign/Adobe's inline sign-in-iframe
  vs. an email-capture-then-send flow closer to how SignedBy already
  works) and picked the email-mediated version deliberately, for
  reasons specific to where SignedBy is right now:
  - This feature is speculative (Michael's own "could be good to
    explore," not a repeated customer ask) — the job is to find out
    cheaply whether anyone embeds this at all, not to match BoldSign
    feature-for-feature on the first pass.
  - It reuses essentially the entire existing pipeline — document
    creation from a template, `signing_token`, the emailed link, the
    full field-fill-and-sign UI, the audit trail — rather than building
    a new iframe-embeddable sign experience from scratch.
  - It avoids the real, ongoing clickjacking/CSP exposure that inline
    signing-in-an-iframe requires (see Security section below) almost
    entirely, because the sensitive part — actually viewing and signing
    the document — never runs inside a third-party iframe. It happens on
    signedby.ai, reached via a link the visitor opens from their own
    inbox, exactly like every other document today.
  - Matches the "reuse over reinvent" pattern used for every other
    feature built this session (e.g. the contract-end-date reminder
    riding the existing cron/email infrastructure instead of new
    plumbing).
  - **Named trade-off, not ignored:** this is a real step down from what
    BoldSign/Adobe ship — a context switch (leave the site, open email,
    click through) instead of "sign right here." Full inline signing
    (Option A) stays a possible Phase 2, revisited only if Phase 1 shows
    real embed adoption/conversion — not scoped further now.

## Phase 1 shape: capture-and-send, not inline signing

**Widget itself is NOT an iframe.** Since all it needs to do is collect a
name + email and hand off, it can be a small JS snippet
(`<script src="https://signedby.ai/embed.js" data-template="{workspace}/{template}">`)
that renders form fields directly into the host page's DOM and does a
plain `fetch()`/XHR POST to a new SignedBy endpoint — no iframe, so no
`frame-ancestors`/`X-Frame-Options` relaxation needed anywhere. This
replaces the CSP/clickjacking question from the original scope with a
smaller one: CORS on one new public endpoint (see Security below).

**Flow:**
1. Visitor lands on the embedding site, sees the SignedBy widget (inline
   `<div>` or popup, mirroring Calendly's own two entry shapes), fills in
   name + email.
2. Widget POSTs `{workspace-slug, template-slug, name, email}` to a new
   public endpoint.
3. Endpoint validates the template is published/embeddable, creates a new
   `documents` row from the template with the visitor as the sole
   recipient (`order_index: 0`), then runs the **existing** send logic
   (`api/documents/[id]/send/route.ts`'s emailing path) to deliver the
   normal signing-link email — no new email infrastructure.
4. Widget shows a lightweight "Check your email to sign" confirmation
   state on the host page. Actual field-filling and signing happens
   entirely on signedby.ai via the emailed link — today's flow,
   completely unchanged.

**Security — narrowed from the original scope's iframe/CSP concern:**
the new public endpoint is unauthenticated by design (the whole point is
an anonymous site visitor can trigger it) and both creates a document and
sends an email on the org's behalf every time it's hit. That's real new
abuse surface that didn't exist before: needs rate-limiting (per
IP/template/org), and probably a cap tied to the template's published
state so a Free org can't be email-bombed or have its send volume
exhausted by a hostile actor hammering the public endpoint. Not a
blocker, but a real requirement, not an afterthought.

**Branding-tier display** — same as before: the confirmation state and
the eventual signing-link email are exactly the surfaces already gated by
the existing `hasBranding` flag ([[signer-growth-cta]]), so a
branding-tier org suppressing "secured by SignedBy" on this flow is the
same pattern already used elsewhere, not new design work.

**Mobile** — the widget itself is simple form fields (no PDF viewer, no
field-fill UI), so it inherits little risk from the host page's mobile
layout. The actual signing experience is the existing signing flow,
already mobile-passed ([[mobile-ux-sender-side-pass]]), reached as a
normal full-page mobile browser tab, not squeezed into someone else's
iframe.

## Workspace / template short-name schema (still the pacing item)

Checked 2026-08-24: neither piece exists as data today.
`organizations` has no slug/short-name column at all; `templates` has
slugs only for the built-in public marketing pages
(`src/lib/template-pages.ts`), not for a user-created template inside a
workspace. Concrete proposal:

- `organizations.slug text unique` — globally unique (Calendly-username
  shape), nullable until claimed, claimed once by the org owner/admin in
  Settings.
- `templates.slug text` — unique **within its org** only (the workspace
  prefix already disambiguates), via a composite unique index
  `(org_id, slug)`.
- **New consideration surfaced 2026-08-24, not in the original doc:** if
  `{workspace}/{template}` lives at the site root (`signedby.ai/acme-co/
  engagement-letter`), it can collide with existing top-level routes
  (`/dashboard`, `/templates`, `/pricing`, `/es-ar`, etc.) — needs either
  a reserved-word blocklist on slug claims, or a dedicated path prefix
  (`signedby.ai/e/{workspace}/{template}`) to sidestep collisions
  entirely. Michael's call which.

## Open questions — still genuinely unresolved

1. Reserved-word blocklist vs. a dedicated `/e/` prefix for the URL
   scheme (see schema section above).
2. Rate-limiting/abuse-prevention shape for the new public
   create-and-send endpoint (per-IP? per-template? per-org daily cap?
   CAPTCHA on the widget itself?).
3. Whether Phase 1's "check your email" confirmation state needs any
   richer content (e.g. showing which document/template they're about to
   receive) or stays minimal.
4. Full inline signing (Option A / BoldSign-Adobe shape) stays a
   possible Phase 2 — not scoped further now, revisited only if Phase 1
   shows real adoption.

## Suggested next step

Scoped, Phase 1 shape decided (capture-and-send, reusing the existing
send/email/signing pipeline, no iframe). Not approved to build, per
[[feedback-scope-means-scope-only]]. Pacing item is still the workspace/
template short-name schema work, now joined by picking the URL-collision
approach (open question 1) and the rate-limiting shape (open question 2)
before real technical planning.
