# Browser quick-actions + Gmail send — scope

Status: **scoping, not built. Decided: Part A (Chrome extension) only for
now — Part B (Gmail Add-on) deferred**, per direct decision. Follow-on from
looking at Apollo's Chrome extension: not a copy of Apollo's "works on
every website" pattern (wrong fit — see below), but the narrower,
precedented version. Part B's writeup is kept below for when it's picked
up later, but nothing in it is in scope for the current build.

## Why Apollo's exact pattern doesn't map (recap)

Apollo's extension earns its "read and change all your data on all
websites" permission because scraping contact data off arbitrary pages
*is* the product, for a category (sales prospecting) that lives in the
browser dozens of times a day. SignedBy's send-a-document action happens a
handful of times a week for the actual target customer, and the product
handles signed legal documents and PII — asking for that same broad grant
to justify comparatively rare use would be a bad trust trade for exactly
the small-business/legal-conscious buyer SignedBy is going after.

Checked what actual e-signature competitors ship instead: DocuSign's
Chrome extension is scoped to viewing envelope/document status, sending
reminders, and signing/sending — not page scraping — plus a separate Gmail
integration for attach-and-send. That's the shape this scopes.

## Technology correction: two different platforms, not one Chrome extension

Checked current (2026) guidance on this directly, and the right answer
splits the original ask into two separate builds on two separate Google
developer platforms, not one Chrome extension covering both:

- **Status/quick-actions → a real Chrome extension**, but popup-only, no
  content scripts. It never needs to read or modify any webpage — it just
  calls SignedBy's own API from a toolbar popup — so its permission ask is
  close to nothing: no "all websites" access at all, nothing resembling
  Apollo's permission dialog.
- **"Send via SignedBy" inside Gmail compose → a Google Workspace Add-on**
  (built on Apps Script / the Workspace Add-ons framework), **not** a Chrome
  extension content script injected into Gmail's DOM. Current guidance is
  explicit about why: a DOM-injected content script is brittle (breaks every
  time Gmail's UI changes), web-only (doesn't reach the mobile Gmail apps),
  and is specifically the wrong choice for anything a Workspace admin might
  need to approve for their org — which, given SignedBy's actual small-
  business customer base often runs on Google Workspace, is a real
  consideration, not a hypothetical one. A Workspace Add-on is governed,
  cross-device, and is Google's own steered path for this exact case.

Practically: two codebases, two developer consoles (Chrome Web Store +
Google Workspace Marketplace), two review processes, not one.

## Part A — Chrome extension (status + quick actions)

- Toolbar popup: your N most recent documents with status (draft / sent /
  viewed / signed / completed / declined), a "sign" link that deep-links to
  the real `signedby.ai` signing page (not a reimplemented signing UI in a
  350px popup — see "explicitly out of scope" below), and a "send reminder"
  button.
- "Send reminder" already exists server-side
  (`api/documents/[id]/signers/[signerId]/remind/route.ts`) but is
  dashboard-session-gated only, not on the public v1 API — this needs a
  small v1-equivalent endpoint (or the personal-token auth in Part C reusing
  the existing dashboard route) before the popup button can call it.
- Manifest V3, `action` popup + a service worker for the API calls only.
  Host permission limited to SignedBy's own API domain.

## Part B — Gmail Workspace Add-on ("Send via SignedBy") — DEFERRED, not in scope now

Kept here for context/future reference only. Not being built alongside
Part A.

- From an email with a PDF attachment (or from compose), an action that
  sends that specific PDF for signature — recipient defaulted from the
  email's own To/From field, sender confirms and sends.
- **This reopens a gap the CRM/Make Phase 1 scope deliberately deferred:**
  that scope's Part A only proposed template-based document creation via
  API, explicitly *not* "create from an arbitrary uploaded PDF," reasoning
  that template-based is the standard integration convention. Sending an
  actual Gmail attachment doesn't fit that — there's no template to pick,
  it's a real uploaded file. Building Part B means building that deferred
  capability (upload handling + either an AI-suggest field-placement call or
  a simple "just get a signature here" default) sooner than the CRM scope
  assumed.
- Scopes/review: Gmail Add-ons that touch compose or message content sit in
  Google's restricted/sensitive-scope tiers depending on exactly what's
  requested (e.g. `gmail.addons.current.message.metadata` for compose
  context) — which exact tier applies, and whether it triggers Google's
  fuller OAuth verification/security assessment, needs confirming against
  the specific scopes chosen before sizing this, not assumed. Real,
  separate effort in the same *category* as (much smaller in degree than)
  the DATEV certification process already flagged in the CRM scope doc —
  a platform-owner review gate, not a self-serve API key.
- Distribution: Google Workspace Marketplace listing, separate from the
  Chrome extension's Chrome Web Store listing.

## Part C — Auth: the real prerequisite for both, and it doesn't exist yet

Checked `lib/api-auth.ts` and `lib/org.ts`: the only two auth mechanisms in
this codebase today are (1) the dashboard's cookie-based Supabase session,
and (2) the single org-wide, Business-tier-gated API key. Neither fits a
browser tool used by one person on their own machine — a shared org secret
has no business living in a browser extension's storage, and a cookie
session doesn't cross into extension/Add-on contexts the normal way.

Proposed: a "Connect" flow — the extension/Add-on opens a SignedBy page the
user is already logged into (real Supabase session), which issues a
personal access token scoped to that individual user, passed back and
stored locally by the extension. Same shape as how CLI tools and IDE
plugins commonly authenticate (GitHub CLI's and Vercel CLI's browser-based
login flows are the well-known version of this pattern) — not a new
invention, a well-trodden one.

Whether this personal token should be Business-tier-gated like the
existing API key, or available on lower/all tiers since this is more
"a different surface for everyday actions" than "integration tooling," is
a real product call — flagged as an open question, not assumed either way.

## Explicitly out of scope for this pass

- Apollo-style broad web access / page scraping — deliberately not this
  shape, per the reasoning above.
- Reimplementing the actual signing UI (field-filling, signature capture)
  inside the extension popup or Add-on sidebar. Always deep-links out to
  the real signing page — this app's signing flow already carries a lot of
  device-specific polish (mobile card-mode, progressive rendering, auto-
  advance) that a cramped popup/sidebar can't and shouldn't try to replicate.
- Mobile Safari/Firefox extension equivalents — Chrome + the Workspace
  Add-on (which does reach Gmail's mobile apps on its own) only, this phase.

## Decisions

1. **Scope is Part A only.** Part B (Gmail Add-on) is deferred — not
   sequenced "later this phase," just off the table until it's separately
   picked up. Nothing in Part A depends on it, so this doesn't block
   anything below.

## Open questions

1. Personal access token (Part C — still a real prerequisite for Part A on
   its own, this isn't specific to Part B): Business-tier-gated like the
   existing API key, or available more broadly since this is more "a
   different surface for everyday actions" than "integration tooling"?
