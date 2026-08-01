# Verified Badge (freelancer "proof of human work") — scope + build notes

Status: BUILT 2026-08-01 (go-ahead: "Let's build it"). tsc/eslint/vitest
(554 tests)/`next build` all clean in the sandbox. Not deployed — see
"Build notes" at the bottom for exactly what's left before this is live.

Three things came in together and are really one idea, scoped as one doc:
a top-of-funnel growth play ("Generate Your Proof"), the product behind
that CTA (the Badge — identity verification + file sealing + a
client-facing ledger page), and an MCP/API integration layer on top of it
(`seal_document` tool, `/seal` endpoint). Taking them in that order below,
because the growth copy makes a promise the product doesn't keep yet.

## Why this one

The pain point is real and well-targeted: freelancers already are
SignedBy's stated ICP (the Reddit campaign already runs against r/SaaS,
r/freelance, r/consulting), and "a client's AI detector falsely flags my
human work" is a specific, current, high-anxiety scenario for writers,
designers, and developers — sharper than generic "prove your work" copy.
Not naming competitors (AI detectors, not e-signature rivals) is the right
call: this is a wedge against a third-party pain point, not a head-to-head
comparison page like the existing `/vs/*` pages.

The strategic case for the Badge itself, beyond the campaign: it turns
SignedBy's existing hash-based verification (`/verify`, already public and
shipped) from something a *signer* passively benefits from into something
a *freelancer* actively markets with — every sealed file emailed to a
client is a mini SignedBy impression. Same mechanism as the referral loop
(`referral-loop.md`), different trigger.

## The catch: the CTA promises a product that doesn't exist yet

"Generate Your Proof" needs a real destination the moment someone clicks
it. Right now there is no self-serve "seal any file, get a badge" flow —
what exists is coupled to the multi-party sign pipeline (below). Shipping
the campaign copy before the Badge is real would be the same honesty
problem already avoided elsewhere in this project (see
`free-template-landing-pages.md`'s "honest Starter-gated AI CTA copy" and
the recipient-facing no-overclaiming pattern throughout). The copy is
good; it just can't go live until there's something behind it.

## What it would be

Verified Badge is its own sub-brand — same shape as Magic Quote: its own
landing page and positioning, not a feature buried in the dashboard. One
difference from Magic Quote worth being explicit about: Magic Quote is
free on every plan; Verified Badge is Console/MCP-gated and metered (see
Decisions below), so the sub-brand treatment is about presentation and
positioning, not about being free-for-all the way Magic Quote is.

**1. Identity verification, via self-signing (pivoted 2026-08-01).** The
Badge's core claim — "certified by a verified human" — needs a real
identity check behind it. Rather than a separate account-level Settings
flow, Verified Badge is modeled as an ordinary document sent to exactly
one signer: the freelancer, signing their own file. This reuses
`STRIPE_IDENTITY_SCOPE.md`'s existing per-signer Stripe Identity check
as-is — no second, narrower identity feature to build — while a reused
verified session (not a fresh ID-scan per document) keeps it cheap and
frictionless. See Decisions for the full reasoning and the cost/friction
math behind not re-verifying every single seal.

**Real gap this surfaces:** `STRIPE_IDENTITY_SCOPE.md`'s data model
(`identity_verified_at`, `stripe_verification_session_id`,
`identity_verified_name` on `signers`) is per-document, per-signer — it
has no concept of "reuse this verification for a future, different
document," which is exactly what Verified Badge's reused-session model
needs. That means new org-level columns (same three fields, shape,
homed on `organizations` instead of `signers`) are a real, distinct
requirement of this doc, not something `STRIPE_IDENTITY_SCOPE.md` already
covers — worth listing as its own line item when this gets built, not
assumed to fall out of the existing per-signer work for free.

**Settings: verification status + manual re-verify (added 2026-08-01).**
Given that gap, a user has no way to know whether their next seal will
reuse an existing check or trigger a new one — so Settings needs a small
status indicator ("Identity verified [date]" / "Not yet verified") plus a
link to redo the check on demand. Same shape as the existing API key
card in Settings → Integration & API (shows the credential's state,
offers a regenerate action) — not a new UI pattern, just this feature's
version of it.

**2. The sealing primitive.** A freelancer uploads a finished file
(PDF, code, design export — not necessarily a PDF the way every existing
SignedBy document is). The system hashes it, timestamps it, and stores a
record. This is genuinely new, not a rename of the existing flow — see
"How this fits existing code" below for exactly why.

**3. The client-facing ledger page.** A public page (`/verify` already
exists and does the equivalent lookup for completed signed documents) that
says "This file was sealed by [Freelancer Name] on [Date, Time]. It has
not been altered since." Needs its own copy/framing distinct from the
existing signer-completion version, and needs to show a person's verified
identity rather than a signer count.

**4. The CTA / landing page.** Its own page, following the established
`/magic-quote` shape (`src/app/magic-quote/page.tsx`): hero (the
AI-detector-anxiety pain point from the original top-of-funnel copy, plus
the badge visual as the hero image), "How it works" (upload your finished
file → SignedBy seals it → embed the badge on the deliverable/invoice →
client scans it → lands on the ledger page), a trust/credibility section
explaining what's actually being proven — same role as Magic Quote's "Math
you can trust" section, honestly framed the way this whole doc's "What it
doesn't solve" section requires (a provenance/timestamp proof, not literally
disproving an AI detector), then the "Generate Your Proof" CTA, and an FAQ
covering the obvious questions (what if my identity check is old, does
this work for non-PDF files, what does the client actually see). This is
the actual destination the original top-of-funnel copy needs before that
campaign can honestly go live — see "The catch" above.

**5. The Badge asset.** A visual, embeddable seal — **decided:** must
incorporate a QR code (linking to the per-document ledger page), the
SignedBy logo, and the verification URL as visible text, not just the QR
— so it reads as legitimate even printed or screenshotted, not only when
scanned. Same "turn backend infra into a shareable asset" idea as the
existing brand-badge exploration (`signedby-feather-brand-assets.md`), now
tied to a real per-document URL instead of being a static brand mark.
Likely produced with the same SVG-based pipeline already used for the
LinkedIn company banner (`linkedin-company-page-banner.md` — SVG +
cairosvg, no headless-browser dependency) rather than a canvas/screenshot
approach, since this needs to generate a fresh badge per sealed document
(different QR payload every time), not a single static image.

## How this fits existing code

**Reusable as-is:**
- The hash-and-verify *pattern*: `generate-signed-pdf.ts` computes a hash
  at completion; `/api/verify/route.ts` + `/verify/page.tsx` do the public
  lookup. The mechanism (compute a hash, store it, look it up by hash,
  return only non-sensitive aggregate facts) is the right shape to copy.
- `audit_events` as the event log this hangs off, same as every other
  feature in this codebase.
- The MCP tool pattern from `AI_AGENT_MCP_SIGNING_SCOPE.md` (thin wrapper
  around an existing action, `authenticateApiRequest()` for auth, the
  `consoleAccess`/metering precedent) — directly reusable *shape* for a
  future `seal_document` tool, once there's a `sealDocumentAction` to wrap.
- Console's confirm-before-send guardrail (`console-actions.ts`,
  `sendDocumentAction`) is exactly the existing precedent for the
  human-in-the-loop safeguard already suggested for a batch-seal case.

**Reusable after all, per the self-sign pivot:**
- `/api/verify` matches hashes where `audit_events.event_type =
  'completed'`, which requires `documents` + `signers` with a real signer
  completing a flow. Originally this looked like a gap (a freelancer
  sealing their own file has no counterparty), but modeling a Badge as a
  document sent to exactly one signer — the freelancer themselves — means
  this requirement is just satisfied normally. No signer-less row, no
  fenced marker, no schema exception. One real difference from a normal
  send: the recipient and the sender are the same account, so the UI needs
  to skip anything that assumes "the signer is someone else" (an invite
  email to yourself would be pointless, for instance) — a UX-level
  short-circuit, not a data-model change.
- Identity verification: nothing in the codebase today (confirmed by
  search) beyond the scoped-not-built `STRIPE_IDENTITY_SCOPE.md` — but
  that doc's existing per-signer design is now the *entire* dependency,
  not a starting point for a second, separate identity feature.
- File types: **decided — PDFs only for v1**, matching every existing hash
  in this codebase (all of a PDF produced by SignedBy's own pipeline).
  Arbitrary file types (code, design exports, translations) stays a later
  phase, not v1.
- The Badge visual asset generator and the new ledger-page copy.

## The self-sign experience (clarified 2026-08-01)

Asked directly: what's the signing-side UX for the self-sign pivot? The
honest answer, since this surfaces a real gap — reusing the existing
signer flow unmodified would be bad UX (an email invite to yourself, a
redirect to `/sign/[token]`, field placement, an OTP gate, drawing a
signature — all built for an external counterparty, none of it
appropriate here) and would directly fight this feature's whole
"frictionless, no extra steps" premise.

**Decided: there's no signing-side UI at all.** No invite email. No
redirect to `/sign/[token]`. No drawn signature — the proof is the hash
and the identity check, not a signature graphic. Everything happens
inside the same Console chat turn: the user supplies the file and answers
the appended/separate/both question, the assistant confirms (same
guardrail as the existing confirm-before-send pattern), and the backend
creates the `documents`/`signers` rows and marks that signer complete
immediately, server-side — synchronously, since identity was already
established via the reused Stripe Identity session and consent was just
given in the chat confirmation itself. `sent` and `completed`
`audit_events` land back-to-back rather than being separated by however
long an external signer normally takes to respond.

**Simplification this implies:** none of `/sign/[token]`'s existing
machinery (field rendering, the per-recipient auth gate, page-view
tracking, decline handling) needs to be touched or extended — the
self-sign path never renders that surface at all. Smaller build surface
than "reuse the signer flow" originally implied.

## Related, smaller addition: the badge on the *standard* certificate page

Requested 2026-08-01, while building this: put the same badge visual
(QR + black/option-C mark + URL) on the existing "Certificate of
Completion" page (`addCertificatePage` in `generate-signed-pdf.ts`) that
every normal multi-party signed document already gets — not just Verified
Badge documents. Right now that page prints the hash as plain text; anyone
checking it has to manually copy 64-128 hex characters into `/verify`. A
QR code that jumps straight there is a real, independent UX improvement.

This is decoupled from the rest of the doc — it needs none of Verified
Badge's new pieces (self-signing, reused identity sessions, Console
gating, the sub-brand landing page). It targets `/verify?hash=...`, which
already exists and needs no changes. The only new technical piece is
generating the QR server-side at PDF-build time (a Node QR library, e.g.
`qrcode`, producing a PNG `pdf-lib` can embed — different code path than
the client-side JS QR library used for the chat mockup) and adding the
small badge mark image alongside it on the certificate page layout.

Small effort, and since it's independent of Verified Badge's bigger
dependencies (identity verification, self-sign pivot, Console/MCP
gating), it's a reasonable candidate to ship first or in parallel rather
than waiting on the rest of this doc.

## What comes back

Three deliverables per seal, not one:

1. **The sealed file(s)** — shape depends on the appended/separate/both
   choice below. "Appended" reuses `generate-signed-pdf.ts`'s existing
   `addCertificatePage` pattern (title, document ID, hash, signer info),
   swapped to "Sealed & Identity-Verified" framing, baked into the
   original PDF. "Separate" returns the original file untouched plus a
   standalone certificate PDF. "Both" returns all three.
2. **The Badge image** — a standalone downloadable asset (black/option-C
   mark, QR, verification URL), separate from the sealed PDF, meant to be
   reused across many documents/contexts (invoice footer, portfolio site,
   email signature), not tied to one file.
3. **The verification URL** — the specific ledger-page link for that
   document, the same one the QR encodes, for contexts where a QR isn't
   practical.

Via Console chat these surface as download links in the reply; via the
`seal_document` MCP tool, as structured fields in the tool response (sealed
file URL, badge image URL, verification URL) so an agent can act on them
without a human downloading anything.

**Decided (2026-08-01, refined): user's choice per seal, asked
conversationally, with three options.** Since this whole feature is
Console/MCP-only (no dashboard UI — see Decisions above), there's no form
to put a checkbox on anyway. The natural place for this choice is the
Console chat flow itself: the assistant asks — appended to the original
file, kept as a separate certificate document, or both — the same
"collect the missing/ambiguous parameter conversationally before calling
the action" pattern the console chat backend already uses (e.g. confirm-
before-send). Underneath, this is still a parameter on the seal action
(something like `certificateMode: "appended" | "separate" | "both"`), not
a new kind of primitive — the conversational collection is a chat-UX
layer on top, not a different code path per choice. "Separate" means the
original file returns byte-for-byte untouched, and a distinct certificate
PDF is generated alongside it as its own deliverable.

**Settings override, added 2026-08-01:** a preference in Settings —
default "ask me every time" (the conversational flow above) vs. "always
append" (skip the question, use appended automatically). Real precedent
for exactly this shape already exists: `/api/org/console-settings`
(`PATCH`, session-authenticated, any org member can adjust — same
permission level as the existing spend-cap toggle it already handles) is
the natural place to add this as one more org-level column, not a new
settings surface. A returning user with a strong standing preference
shouldn't be asked every single time; a new user gets the flexible,
explained default. If it's ever worth extending to "always separate" or
"always both" as additional one-click presets, this is the same
mechanism to hang them off — not scoped now, just noted as the natural
extension point.

## What it doesn't solve

This is a provenance/timestamp proof, not an AI-detector rebuttal tool —
it can't tell a client "this text wasn't written by an LLM," only "this
exact file existed, unaltered, as of this verified timestamp, sealed by a
[verified/unverified] person." That's a real, useful, different claim, and
the campaign copy should stay carefully on the honest side of that line
the same way SignedBy's eIDAS/AES-not-QES framing already does elsewhere
in this project's legal-facing copy.

## MCP / API integration — the actual delivery mechanism, not a fast-follow

**Decided: Console/MCP only, metered at the same pricing as Console**
(20 free document-seals/month, then billed per seal — same numbers,
same Stripe metering plumbing as `console-usage.ts`). This is narrower
than the original sketch of a standalone `/seal` REST endpoint for
Business's flat included API — there isn't one for v1. The only two doors
in are the Console chat ("seal this file") and an MCP `seal_document`
tool, both calling the same new `sealDocumentAction`-shaped function,
exactly the pattern `console-actions.ts` already establishes for
`sendDocumentAction` (shared by console chat and `/api/mcp`'s
`create_and_send_document`). No dashboard UI button for v1, no
Business-tier unmetered path — this rides entirely on the Console
product's existing gate (`consoleAccess`, Pro+) and metering model.

Practically, this *reduces* the build versus the original three-piece
sketch: no separate public REST product surface to design, document, or
rate-limit independently — it inherits Console's existing auth, metering,
and cap-checking wholesale. Human-in-the-loop confirmation on the MCP tool
side still matters and should mirror the existing confirm-before-send
guardrail already built into the console chat backend.

## Effort

Large — closer to a new product surface than a feature addition, though
the decisions above trim it some: the account-level identity check is
meaningfully smaller than the full per-signer Stripe Identity build, and
Console/MCP-only (no standalone REST product, no dashboard UI) skips a
chunk of API-surface design and docs work. Rough shape, not an estimate:
account-level Stripe Identity integration, the sealing primitive + its
guarded signer-less path, the public ledger page, the per-document badge
generator (SVG + QR, cairosvg pipeline), the sub-brand landing page, and
the Console-chat/MCP action function they all sit behind. The growth copy
in this doc's opening ask is still the cheapest part of the whole idea.

## Decisions (2026-08-01)

1. **Verified Badge is its own sub-brand**, positioned like Magic Quote —
   own landing page, own pitch — but gated/metered like Console, not free
   like Magic Quote.
2. **Console/MCP only, metered at Console's existing pricing.** No
   standalone flat-fee Business REST endpoint for v1; no dashboard UI
   button either. Console chat and the `seal_document` MCP tool are the
   only two entry points, sharing one action function.
3. **PDFs only for v1.** Arbitrary file types (code, design exports,
   translations) are a later phase.
4. **SUPERSEDED by decision 6 below** — no signer-less row after all; see
   the self-sign pivot.
5. **SUPERSEDED by decision 6 below** — no separate account-level Settings
   verification flow; see the self-sign pivot.
6. **Pivot (2026-08-01): model Verified Badge as self-signing, not a new
   signer-less primitive.** A Badge is an ordinary document sent to
   exactly one signer — the freelancer signing their own file. This
   supersedes decisions 4 and 5: no signer-less `documents` row, no new
   fenced marker, no separate account-level Settings verification UX.
   Every existing assumption (`audit_events` completion logic, `/verify`'s
   signer-count query) keeps working unmodified. Identity verification is
   exactly `STRIPE_IDENTITY_SCOPE.md`'s existing per-signer build, applied
   to a self-addressed signer — not a second, narrower identity feature.
   **Important refinement, not literal per-document re-verification:** a
   fresh Stripe Identity check (ID scan + selfie) on every seal is both
   cost-negative (~$1–1.50/check vendor cost against a $0.25/document
   price) and friction that fights this feature's whole "no extra steps"
   premise. Instead, the first self-sign triggers the real check; Stripe
   Identity's verified session/customer object is reused for later seals
   until it needs refreshing. This keeps a genuine per-document *signing
   event* to anchor the ledger page's timestamp to, without a per-document
   *identity check*.
7. **Badge visual**: QR code + SignedBy logo + the verification URL as
   visible text, generated per-document (not a static image), likely via
   the same SVG+cairosvg pipeline as the LinkedIn banner work. **Mark
   treatment confirmed against the real assets in `brand-assets/badge-only/`:
   the black slash badge (`signedby-badge-black-slash-optionC-*`), not
   yellow** — a static verification seal isn't a conversion CTA, so it
   shouldn't use the yellow reserved for that (see `design-system.md`'s
   accent rule), and option C's shorter, more compact slash proportions
   are the ones actually in use (matches `src/app/icon.svg`), not the
   taller A/B variants.

## Open questions

- **Resolved by the self-sign pivot:** the ledger page shows the signing
  individual's name as primary ("Sealed and identity-verified by Jane
  Doe"), org name as secondary context if one exists — safe now that every
  Badge has exactly one real, verified signer behind it, not an ambiguous
  account-level claim across a multi-person org.
- **Remaining nuance:** since the identity check itself may be reused from
  an earlier verified session rather than freshly performed at the moment
  of this specific seal, the ledger page should distinguish "signed on
  [date]" (true every time, cryptographically real) from "identity
  verified on [date]" (may be an earlier date) rather than implying both
  happened simultaneously. Small-print precision, not a blocker — same
  honesty standard as the AES-not-QES framing already used elsewhere.
- How long a verified session stays reusable before Stripe Identity
  requires a re-check (their policy vs. a SignedBy-side freshness window)
  — affects both cost and the honesty of "verified on [date]" over time.

## Build notes (2026-08-01)

Built end to end against this doc's decisions. What shipped:

- **Migration 0042** — `organizations.identity_verified_at` /
  `stripe_identity_verification_session_id` / `identity_verified_name` /
  `verified_badge_certificate_mode`; `documents.is_verified_badge` /
  `certificate_mode` / `certificate_file_path`.
- **Badge asset generator** (`src/lib/badge-asset.ts`) — `qrcode` + `sharp`
  (both added as new dependencies), not the cairosvg pipeline the doc
  guessed at: this needs a fresh QR per document at request time inside a
  Vercel function, so a pure-JS/no-system-deps path won. Two exports:
  `generateCertificateBadge` (compact, for every signed document's
  certificate page) and `generateVerifiedBadgeImage` (the full standalone
  Badge deliverable). Both use the real black/option-C mark asset, copied
  into `public/brand/verified-badge-mark-black.png`.
- **The decoupled certificate-page QR addition** shipped too —
  `generate-signed-pdf.ts`'s `addCertificatePage` now embeds a QR+mark badge
  on every signed document's certificate page, not just Verified Badge ones,
  replacing the old plain-text "paste this hash at signedby.ai/verify"
  instructions.
- **Org-level Stripe Identity** (`src/lib/identity.ts`,
  `POST /api/org/identity/start`, a new webhook case in
  `webhooks/stripe/route.ts`) — reused-session model per decision 6, with a
  365-day freshness window (`VERIFICATION_FRESHNESS_DAYS`) as the concrete
  answer to this doc's one remaining open question.
- **`sealDocumentAction`** (`src/lib/verified-badge-actions.ts`) — the
  self-sign primitive: creates a self-addressed signer, marks it complete
  synchronously, generates the sealed file(s) per `certificateMode`
  (appended/separate/both), snapshots `identity_verified_at` into the
  `completed` audit event's metadata (not read live off `organizations`) so
  a later re-verification can't retroactively change what an older seal's
  ledger page claims.
- **Console chat** — a new "Get a Verified Badge" attach-menu option
  (`console-chat.tsx`), reusing the existing upload-a-template presign/PUT/
  finalize mechanics minus the suggest-fields pass. The appended/separate/
  both question is asked via inline quick-reply buttons, NOT routed through
  Mistral's tool-calling loop — `seal_document` is confirm-only and absent
  from `TOOLS`, same safety pattern as `save_as_template` (never let the
  model resolve/guess a raw document_id).
- **MCP `seal_document` tool** (`/api/mcp/route.ts`) — takes the file as
  `file_base64` (an agent has no upload-button flow), uploads it, then calls
  the same `sealDocumentAction`.
- **Settings** (`dashboard/settings/page.tsx` → `verified-badge-settings.tsx`)
  — identity status + a "Verify identity"/"Redo verification" button (real
  `stripe.verifyIdentity()` call via `@stripe/stripe-js`, already an
  existing-but-unused dependency), plus the certificateMode preference
  select, riding on the existing `/api/org/console-settings` PATCH route.
- **`/verify`** — branches on `is_verified_badge`: "Sealed and
  identity-verified by [name]" framing, with "Sealed on X" and "Identity
  verified on Y" shown as two separate facts per this doc's own "remaining
  nuance" note.
- **`/verified-badge`** — the CTA/landing page, modeled on `/magic-quote`'s
  structure, using a real generated badge image as its hero (not mockup
  art) — `public/hero-verified-badge.png`.
- New download routes: session-gated `/api/documents/[id]/{badge,certificate}`
  and API-key-gated `/api/v1/documents/[id]/{badge,certificate}` (the badge
  image is generated on the fly from the document's stored hash, not
  persisted to R2 — cheap enough to regenerate, avoids a second write per seal).

**Still owed before this is live (none of it buildable from the sandbox):**

1. Apply migration 0042 via the Supabase SQL editor (no linked CLI — see
   the standing migration-workflow note).
2. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel — new env var, the
   client-side counterpart to the existing server-side `STRIPE_SECRET_KEY`,
   needed for the Settings page's `stripe.verifyIdentity()` call.
3. Enable Stripe Identity on the account (if not already) and add
   `identity.verification_session.verified` to this project's existing
   Stripe webhook endpoint's subscribed events, alongside
   checkout/subscription/invoice.
4. ~~Legal~~ — DONE 2026-08-01: `/privacy` (new "Identity verification data
   (Verified Badge)" bullet in Section 2, updated Stripe line in Section 4)
   and `/dpa` (Section 2, sub-processor list, and Annex A's "Types of
   personal data"/"Special categories of data") now describe Stripe
   Identity's government-ID-image and biometric data handling, and are
   explicit that SignedBy itself never receives or stores that raw
   ID/biometric data — only the verification result and confirmed name.
5. Merge to master and deploy (`./deploy-prod.sh` per the standing
   deploy-guard-script workflow) once 1-3 are done.

## Status

Built, not deployed — see "Build notes" above for the exact remaining
checklist.
