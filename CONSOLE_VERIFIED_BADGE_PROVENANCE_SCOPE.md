# Verified Badge provenance — as a Console output, not a dashboard feature

Status: SCOPED, NOT BUILT. Replaces `VERIFIED_BADGE_DASHBOARD_VISIBILITY_
SCOPE.md`'s approach (reversed same day — see that doc's top note) — this
keeps Verified Badge reporting entirely inside Console instead of surfacing
it on the Signing Dashboard's documents list/detail pages.

## What already exists, grounded in code

A successful seal in Console (`console-chat.tsx`, the `m.sealed` block,
~line 1311) already renders a row of outputs once `sealDocumentAction`
returns:

- Copy verify link / Open verify page (`m.sealed.verifyUrl`)
- Sealed PDF (`/api/documents/[id]/signed-file`, only if `hasSignedFile`)
- Certificate (`/api/documents/[id]/certificate`, only if `hasCertificateFile`)
- Badge image (`/api/documents/[id]/badge`, always)

This row is the natural home for what you're describing — "the provenance
report is one of the outputs" fits directly into this existing pattern as a
sixth item, not a new UI concept.

## What "provenance report" would actually contain

Everything the dashboard-visibility scope wanted to surface, minus the
dashboard: who sealed it, when uploaded vs. when verified, the file hash,
which timestamp authority (if any — `TIMESTAMP_AUTHORITY_SCOPE.md`), and
the source (console/mcp — see the narrow-provenance decision already made,
still relevant here since it's the same underlying data, just a different
display surface). All of this is already captured in `audit_events` for
every seal (`created`/`completed` events, `document_hash`,
`timestamp_tsa`/`timestamp_gen_time`, `via_console`/`via_mcp`/
`agent_triggered` metadata) — nothing new to log, only something new to
render.

## Format — leaning downloadable, and it may already be scoped elsewhere

2026-08-04 direction: downloadable, not just a page to check — and
specifically explored as **the same document as `VERIFY_CERTIFICATE_
DOWNLOAD_SCOPE.md`'s dataroom certificate**, not a second, parallel one.

**Why these look like the same feature, checked against that doc's actual
content:** `VERIFY_CERTIFICATE_DOWNLOAD_SCOPE.md` already scopes a
downloadable, one-page, "legally sterile" certificate meant to sit in a
corporate data room next to NDAs and cap tables — built from the exact
verify-safe field set (`title, completedAt, signerCount, orgName,
isVerifiedBadge, sealedBy, identityVerifiedAt, timestampTsa/genTime, hash`),
deliberately NOT reusing the PII-bearing certificate generator. That's
provenance data by another name: who sealed it, when, what hash, what
timestamp authority. If Console's "provenance report" output is this same
document, there's one generator to build, not two, and it can be linked
from both `/verify` (public, anonymous, hash-as-credential) and Console's
own output row (the org viewing their own just-sealed document) without
duplicating logic.

**Already flagged in that doc, still applies here, not re-litigated:**
- eIDAS alignment wording — Stripe Identity is real KYC-grade verification,
  not a certified eIDAS-notified eID scheme. Don't assert regulatory
  alignment without legal review.
- "Chain-of-custody" — SignedBy logs sealing/completion events, not a
  formal chain-of-custody trail in the forensic-evidence sense. Same
  flagged-not-resolved treatment.
- Hash format already decided: SHA-512, no extra hash pass needed.
- The certificate name itself ("IP Certificate" reads as intellectual
  property, not integrity/provenance) is still an open rename question —
  "Verification Certificate" or "Certificate of Authenticity" were the
  candidates raised there.

**Resolved 2026-08-04 — V1/V2 split.** Console gets the certificate
generator first, as an authenticated, Console-only endpoint (the org
viewing its own just-sealed document — not the anonymous `/verify?hash=...`
public flow). `VERIFY_CERTIFICATE_DOWNLOAD_SCOPE.md`'s public-page button
is now explicitly **V2**, deferred until V1 ships — see the note added to
the top of that doc. So: one generator, built once, for Console first;
the public `/verify` page reuses it later rather than being built
alongside it. This also resolves the "same endpoint or its own variant"
question in Console's favor by default — since Console is authenticated
and first, it doesn't need to reuse the anonymous route's exact input
shape; V2 can decide whether to call the same generator with a stricter
field subset or share the route outright, once it's the one being built.

Still open, not decided: does this replace the existing "Badge image"
output, sit alongside it, or is it a distinct third artifact from Sealed
PDF/Certificate/Badge image. Flagging, not deciding.

## What this does NOT require, now that dashboard visibility is off the table

- No changes to `dashboard/documents/page.tsx` or
  `dashboard/documents/[id]/page.tsx` — see the reversed scope doc.
- The audit-trail copy fixes ("Uploaded" / "Verified and sealed" instead of
  the generic signer-flow language) still apply, but only if/when a
  provenance report actually renders that history somewhere in Console —
  no longer a dashboard `AuditTrail` component change.
- The narrow-provenance decision (dashboard/console/mcp `source` values,
  only on Verified Badge seals) still stands as the right scope — just
  rendered in Console's new report instead of a dashboard audit trail line.

## Open questions for you

1. ~~Report format — page, generated PDF, or JSON/text?~~ **Resolved
   2026-08-04: downloadable PDF**, same generator as the (now V2-deferred)
   `VERIFY_CERTIFICATE_DOWNLOAD_SCOPE.md` dataroom certificate.
2. ~~Should the paused "Verified Badge tab on `/dashboard/documents/new`"
   idea be dropped?~~ **Resolved: dropped**, per direct instruction.
3. Does the certificate replace the existing "Badge image" output, sit
   alongside it, or is it a distinct third artifact from Sealed PDF/
   Certificate/Badge image?

## If it's a separate artifact: eIDAS framing, contents, format (2026-08-04)

**eIDAS — no claim, structure only.** The certificate cannot assert eIDAS
alignment or compliance — unresolved legal-review item, same as flagged
throughout ([[legal-pages-subprocessors]], `VERIFY_CERTIFICATE_DOWNLOAD_
SCOPE.md`'s Verified Origin section): Stripe Identity is real KYC-grade
verification, not a certified eIDAS-notified eID scheme. What it can do
honestly is be *structured* around what eIDAS-style trust services care
about — identity verification, integrity, timestamp — without naming the
regulation or claiming alignment. Legal review still owed before any
eIDAS wording ships.

**Contents, four blocks:**
- Document identity — title, file size (new: one R2 HEAD request), SHA-512
  hash.
- Verified origin — identity-verified name (`sealedBy`), verification
  method + date ("identity verified via Stripe Identity on [date]" —
  factual, not a regulatory claim).
- Immutable timestamp — RFC 3161 TSA name, UTC sealing time (gated on
  that deploy shipping, [[rfc3161-timestamp-build]]).
- Statement of integrity — softened hash-confirms-unaltered language, no
  "chain-of-custody" term.
- Plus: SignedBy org/branding, completion date, verify link/QR back to
  the hash-lookup page.

**Format — single-page PDF/A**, not a regular interactive PDF. Matches
what VDR platforms (Datasite, Intralinks, iDeals) actually expect for
uploaded compliance docs: static, embedded fonts, no forms/JS, archives
well. Print-safe letter/A4, plain footer only (no heavy watermark), both
QR code and plaintext hash/URL for redundancy if printed. One page.

## V2 design — triangle layout (2026-08-04)

This is the above content, this same V1 field set, laid out differently
— not a new set of facts, a different arrangement of the same four
blocks. Mocked up above (`certificate_v2_triangle_layout`): the three
"pillar" blocks — document identity, verified origin, immutable
timestamp — sit at the corners of a triangle, each connected by a thin
line to a center hub. The hub holds the statement of integrity, the
hash, and the QR code together, since those three are the part a
reviewer actually checks against the file in hand — putting them in the
visual center makes the "proof" the focal point and the three supporting
facts (what, who, when) read as evidence feeding into it, rather than a
flat top-to-bottom list where the QR code is just the last line on the
page.

Same content as V1, same PDF/A single-page format, same eIDAS-not-
claimed / chain-of-custody-not-claimed wording rules — this is a layout
variant, not a new scope. Worth deciding once both exist: V1's linear
layout is closer to `addCertificatePage`'s existing visual conventions
(cheaper, reuses established look), V2's triangle is more distinctive
and telegraphs "three independent facts converging on one proof" at a
glance — a real design trade-off, not a strictly-better option. Not
decided which ships; flagging for further discussion, matching how this
was raised.

## How to apply

Scoped only. Waiting on the two questions above plus an explicit build
instruction before touching `console-chat.tsx` or adding any new report
route.
