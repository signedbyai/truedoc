# "Verified Agency" pitch-deck badge kit — scope

Status: SCOPED 2026-08-03, not built. Direct ask: a helper badge/section
on `/verified-badge` showing agencies how to put a SignedBy seal on
their own pitch deck or RFP response slides, with proposed copy: "We
are a SignedBy.AI Verified Agency. All final deliverables come with a
cryptographic Proof of Work seal, guaranteeing 100% human-driven
quality and IP protection."

## Read this first: the proposed copy can't ship as written

Checked the proposed slide text against what the product actually does
and against this project's own established rules for exactly this kind
of copy (the same review this session already applied to the RFC 3161
timestamp claim, the eIDAS wording, and the "IP Certificate" naming).
Four separate problems, each real:

**1. "SignedBy.AI Verified Agency"** — there's no such program. Verified
Badge verifies one identity check for an org (reused for 365 days,
[[verified-badge-build]]) and seals individual files — it never vets,
certifies, or approves an agency as a business. Calling an agency a
"Verified Agency" implies SignedBy assessed and endorsed that business,
which never happened.

**2. "cryptographic Proof of Work seal"** — "Proof of Work" is a
specific, existing technical term (computational puzzle-solving, the
Bitcoin-mining mechanism) that has nothing to do with what SignedBy
does. The actual mechanism is a SHA-512 hash plus an RFC 3161 trusted
timestamp ([[timestamp-authority-scope]]) plus a Stripe Identity check —
real cryptography, just not Proof of Work. To anyone who knows the term
(exactly the security/compliance reviewer this slide is aimed at), this
reads as a factual error, not marketing color.

**3. "guaranteeing 100% human-driven quality"** — this is the one that
matters most, because it directly contradicts a rule this exact feature
was built around. `/verified-badge`'s own FAQ, live on the page this
badge would sit on, opens with: *"Does this prove my work wasn't
written or made with AI? No — and it doesn't claim to."* The Reddit
campaign copy for this same feature carries the identical rule
([[verified-badge-reddit-campaign-assets]]): "Never claim this proves
work 'isn't AI' or 'is human.'" SignedBy has no way to know whether AI
was used in producing a document's content — sealing proves the file
existed unaltered as of a verified timestamp, sealed by an
identity-verified person, nothing about how it was made. A badge
claiming to *guarantee* "100% human-driven quality" would say the exact
opposite of what the page directly above it says, in the same product.

**4. "IP protection"** — same issue just flagged in
[[verify-certificate-download-scope]] for the certificate-download
button: SignedBy doesn't register or protect intellectual property.
Sealing proves integrity and identity, not IP ownership.

**Why this one is worth being more emphatic about than a typical copy
note:** this isn't SignedBy's own marketing page overclaiming — it's a
template SignedBy would be *handing to customers to say to their own
clients*, with SignedBy's name attached ("We are a SignedBy.AI Verified
Agency"). If an agency's client later finds out AI was used despite a
"100% human-driven... guaranteeing" claim on a pitch slide, that's a
real misrepresentation the agency made to their own client — using
copy SignedBy wrote and branded. That's a materially bigger downside
than a stray overclaim on signedby.ai itself.

## The underlying idea is good — worth building with accurate copy

Agencies wanting to signal "we take deliverable integrity seriously" to
a prospective client during a pitch or RFP is a real, sensible use
case, and giving them a ready-made slide/badge asset for it is a
legitimate, useful thing to ship — it just needs to say something
SignedBy can actually stand behind. A close rewrite that keeps the
intent and drops the four problems above:

> "Final deliverables are sealed with SignedBy — a cryptographic hash
> and RFC 3161 trusted timestamp confirm the file you receive is
> exactly what we sent, unaltered, from an identity-verified sender.
> Verify any deliverable yourself, no account needed, at
> signedby.ai/verify."

Says something true and checkable (the client can literally scan the
badge and confirm it), doesn't invent a certification program, doesn't
misuse "Proof of Work," and doesn't promise something about how the
work was made that no one can actually verify.

## What this actually needs, mechanically

A new section on `/verified-badge` (or a dedicated `/verified-badge/agencies`
page if it grows large enough to want its own SEO-indexed URL, matching
the pattern already used for Magic Quote's audience-specific landing
pages) offering:
- **A downloadable badge/slide asset** — an image an agency can drop
  straight into a deck, styled consistently with the existing
  Verified Badge visual (`hero-verified-badge.png`'s card, or a
  simplified version sized for a slide corner rather than a document
  footer).
- **The accurate copy above** (or a Michael-approved variant), ready to
  copy-paste as speaker notes / slide body text.
- **A short "how to use this" line** — seal your first deliverable,
  screenshot or download the real badge from that seal, drop it into
  the slide; not a generic pre-made mark unconnected to an actual
  sealed file, since the whole point of Verified Badge is that the
  badge is real and checkable, not decorative.

No backend work — this is a content/design addition to an existing
page, not a new feature surface. The one real engineering question is
whether the slide badge should be a static, generic "we use SignedBy"
mark (available to anyone, no seal required yet) or should require at
least one real seal to exist first (keeping every badge shown anywhere
tied to something actually verifiable) — worth deciding before
building, since it changes whether this is pure marketing copy or an
extension of the existing account.

## Explicitly out of scope

- **An actual "Verified Agency" certification program** — vetting
  agencies, issuing agency-level (not per-document) credentials — a
  much bigger, different product than what was asked; the request reads
  as wanting the marketing artifact, not a new certification business
  line.
- **Any change to what Verified Badge itself proves or verifies** —
  this is a downstream copy/asset addition, not a product change.

## Effort

Small. A new page section, one or two new image assets, and copy —
comparable to the Reddit campaign asset builds already done this
session, smaller than anything requiring a migration or new route.
