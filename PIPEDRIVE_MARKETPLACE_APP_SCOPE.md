# Pipedrive Marketplace app — scope (NOT approval to build)

Status: **scoped only, 2026-08-19**, prompted by "the whole point of this is
to get published and more visible in these CRM marketplaces." Companion to
[[PIPEDRIVE_INTEGRATION_SCOPE.md]] (the two configuration recipes already
built) — this doc covers the different, bigger thing needed to actually
*appear* in Pipedrive's Marketplace, which the recipes do not get you.

## Why the existing Pipedrive work doesn't get you here

`PIPEDRIVE_INTEGRATION_SCOPE.md`'s two recipes (Automations webhook →
`POST /api/v1/documents`, and Make's native Pipedrive module reading
SignedBy's webhook) make Pipedrive *work* for anyone who already has a
SignedBy account and manually wires it up. They do nothing for
*discoverability* — a Pipedrive user browsing the Marketplace for an
e-signature tool will never see SignedBy from either recipe. That doc
flagged this gap explicitly and deliberately stopped short of it, calling
it "the next real decision, not a small follow-up." This is that decision.

## What Pipedrive actually requires (confirmed via Pipedrive's own dev docs, 2026-08-19)

**OAuth 2.0 is mandatory, not optional.** Pipedrive's review process
explicitly disallows API-token collection as free-form user

input — the app must "implement and primarily use OAuth 2.0 for both
authentication and request authorization." This is the core reason this is
a different category of work than Zapier or Make: those integrations
authenticate with SignedBy's own API key, which the org generates and
pastes in once. A Pipedrive Marketplace app instead has SignedBy act as an
OAuth *client* to Pipedrive — SignedBy has to request, store, and refresh
Pipedrive access/refresh tokens per org, something nothing in the codebase
does today for a third-party service (the existing GitHub-login scope is
the opposite direction: Pipedrive-style OAuth would be SignedBy consuming
someone else's API on the org's behalf, not someone logging into SignedBy).

**Concrete technical pieces, based on Pipedrive's registration + approval docs:**
1. A Pipedrive OAuth callback route (`/api/integrations/pipedrive/callback`
   or similar) that exchanges the authorization code for access + refresh
   tokens, using a client ID/secret Pipedrive issues after app registration.
2. A new `pipedrive_connections` table — per-org row storing access token,
   refresh token, expiry, the connected Pipedrive company ID, and who
   installed it. Needs a refresh-token cron/on-demand refresh path, since
   OAuth access tokens expire.
3. At least one hosted **App Extension** — Pipedrive's term for a panel,
   modal, or custom UI iframed directly into their interface (e.g. a
   "Document status" panel shown on a deal, matching the idea already
   floated in the original Pipedrive scope doc). This needs new HTTPS
   routes serving that content, and a **CSP `frame-ancestors` change** to
   explicitly allow `app.pipedrive.com` to iframe it — SignedBy's current
   CSP configuration needs locating and confirming before this is buildable
   (not yet verified this session; flagging as a real unknown, not assuming
   it's a one-line change).
4. Pipedrive's docs mention the app must "process authorization flows and
   manage user sessions across three mandatory installation scenarios" —
   the specific three scenarios weren't fully detailed in what I could pull
   this session and need a closer read of Pipedrive's install-flow docs
   before implementation starts, not guessed at here.

## Non-technical requirements (these gate approval as much as the code does)

Pulled directly from Pipedrive's marketplace listing + review checklist:
- **Listing content:** unique app name, clear value proposition, a
  comprehensive description, step-by-step install instructions, a pricing
  page link, a support contact, 3–5 high-quality images, and a distinctive
  icon. Most of the copy/brand-asset work here can reuse what already
  exists from the Zapier/Make listings (description language, the yellow
  badge/black mark logo), but the images and install-flow screenshots are
  new work.
- **Legal:** signed Developer Partner Agreement, Terms of Service + Privacy
  Policy links (these already exist per [[legal-pages-subprocessors]] — low
  risk here), no trademark/copyright issues.
- **App review support:** a demo video walking through what the app does
  and why it needs the permissions it asks for, a fully functional test
  account for Pipedrive's reviewers, and a named contact person available
  during review.
- **Review timeline:** Pipedrive states submissions currently take up to
  **21 business days** due to demand — this is a real lead-time constraint
  to plan around, not a same-week thing even once built.

## Sizing this against what's already been built

This is a materially bigger lift than Zapier or Make — closer to "a new
small product feature with an OAuth integration" than the config-only
Pipedrive recipes or even the from-scratch Zapier/Make apps, both of which
reused SignedBy's existing API-key auth and outbound webhook system
end-to-end. The token-storage table, refresh handling, hosted
iframe-embedded UI, and CSP change are all genuinely new surface area with
their own security review implications (a new place third-party tokens
live, a new place SignedBy content renders inside someone else's iframe).

## Open questions before any build work starts

- What does the App Extension actually show? The "Document status on a
  deal" panel idea from the original Pipedrive scope doc is the obvious
  starting point, but needs a real UI decision (what fields, what actions
  if any) before scoping the hosted-route work precisely.
- Who is the named support contact / review point of contact for
  Pipedrive's review process?
- Is there a pricing page today that's linkable as-is, or does one need to
  be built/adapted for this listing?
- Who produces the demo video, and on what timeline relative to submission?
- Does the current CSP configuration make `frame-ancestors` additions easy,
  or does it need restructuring first? (Not yet checked this session.)

## Not started

No code, no Pipedrive developer account registration, no OAuth app
creation. Per [[feedback-scope-means-scope-only]] and
[[feedback-scope-before-building-toggles]]: this is a scope doc only. Given
the size of this relative to Zapier/Make, treat it as its own go/no-go
decision, not something to start on the strength of "I answered the scope
doc's questions."

Sources consulted (Pipedrive developer docs, fetched 2026-08-19):
- https://pipedrive.readme.io/docs/marketplace-app-approval-process
- https://pipedrive.readme.io/docs/marketplace-registering-the-app
