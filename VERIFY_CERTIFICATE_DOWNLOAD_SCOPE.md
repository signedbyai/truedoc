# "Download IP Certificate" button on /verify — scope

Status: SCOPED 2026-08-03, not built. Direct ask: a button on the public
verification page so a client can download a PDF for their own
compliance/data-room use — "you are giving them a compliance asset."

## V2 — deferred, 2026-08-04

Michael: the certificate generator should ship **V1 as Console-only**
first (authenticated, the org viewing its own just-sealed document — see
`CONSOLE_VERIFIED_BADGE_PROVENANCE_SCOPE.md`), with **this doc's public,
anonymous `/verify` page button as V2**, built later on top of the same
generator once it exists. Everything below this note is still the right
design for when V2 happens — the verify-safe field set, the rename
question, the dataroom addendum, the eIDAS/chain-of-custody flags all
carry forward unchanged. Nothing here is invalidated, just sequenced
after V1. Do not build the `/api/verify/certificate?hash=...` endpoint or
the `/verify` page button until V1 ships and this doc is explicitly
un-deferred.

## The one finding that changes this scope: the existing certificate template is not safe to reuse as-is

`/verify` (`app/verify/page.tsx`, `/api/verify/route.ts`) is deliberately
built to expose only non-sensitive aggregate facts to an anonymous
visitor — the route's own comment is explicit: "Deliberately returns
only non-sensitive aggregate facts... never signer names/emails/IPs —
so this can be safely shared with anyone checking authenticity."

The app already has certificate-PDF-generation code
(`addCertificatePage`/`buildStandaloneCertificatePdf`,
`generate-signed-pdf.ts`), and the natural first instinct is to reuse
it for this button. **Don't** — checked its actual `CertificatePageOpts`
input directly: for a regular (non-Verified-Badge) document, it loops
over every real signer and draws their **name, email, and IP address**
onto the page (`opts.ipBySigner`, `opts.signers[].email`). That's
exactly the data `/api/verify`'s own design principle says must never
reach an anonymous visitor. Wiring this button to that existing
generator would be a real privacy regression — anyone with a document's
hash (already just a paste-box away, no login) could pull every
signer's email and IP address, not a hypothetical, a direct read of the
function.

(Verified Badge's "sealed" branch is safer by construction, since the
one "signer" is the org itself self-disclosing its own info — but /verify
serves both branches, and the button needs to work for both, so this
distinction alone doesn't resolve the problem.)

## Recommended design: a second, smaller, verify-safe certificate template

Build a new PDF generator that takes **only the fields `/api/verify`
already returns to the browser today** — title, completedAt,
signerCount (a count, not names), orgName, isVerifiedBadge, sealedBy
(Verified Badge only — the org's own self-disclosed name), identityVerifiedAt,
timestampTsa/genTime, and the hash — and draws a one-page certificate
from those alone. Whatever's already safe to render on-screen is safe to
put in a PDF; nothing new gets exposed, and there's no risk of ever
drifting out of sync with the aggregate-only design the rest of this
page already enforces. Visually, this can reuse `addCertificatePage`'s
general layout conventions (heading, dark/gray text colors, checksum
block, QR-to-verify footer) without importing its data-fetching logic —
a shared "look" is fine, shared signer-PII access is not.

**Why not just serve the existing `certificate_file_path` file when one
exists?** Checked `documents.certificate_file_path` — it's only
populated for Verified Badge documents sealed in "separate" or "both"
certificate mode (`/api/v1/documents/[id]/certificate` 404s with "No
standalone certificate for this document" otherwise). Most completed
documents — every regular signed contract, and Verified Badge seals in
the default combined mode — have no such file at all; the certificate
content lives merged into the main signed PDF instead, which itself is
never safe to expose from a public hash lookup (it's the actual private
document). Generating fresh from the verify-safe field set, on demand,
works uniformly for every document `/verify` already supports — no
special-casing which documents happen to have a persisted file.

## New endpoint

`GET /api/verify/certificate?hash=...` (new route, same directory as
the existing `/api/verify` lookup). Re-runs the identical hash lookup
`/api/verify` already does (or factors that DB query into a small shared
helper so the two routes can't drift), generates the verify-safe PDF
on the fly, and streams it back with a `Content-Disposition: attachment`
header — no persistence needed, nothing new to store. Same
`checkRateLimit` pattern as the existing route (`verify:${clientIp}`,
30/300s) — PDF generation is more expensive than the existing route's
plain DB lookup, so this may want its own, tighter limit rather than
sharing the exact bucket, worth deciding at build time rather than
assuming the same numbers transfer directly.

## Button placement

Inside `verify/page.tsx`'s existing `result.verified && ...` blocks
(both the Verified Badge branch and the generic-document branch) — a
button rendered only once a real match is confirmed, right below the
existing `<dl>` fact list. Straightforward: the page already has
everything it needs (the hash the visitor typed/arrived with) to call
the new endpoint.

## The name itself is worth reconsidering before shipping

"IP Certificate" is ambiguous in a way that could genuinely mislead: in
a compliance/legal context "IP" reads as **intellectual property** —
implying this certifies or registers an IP right (copyright, ownership),
which SignedBy does not do and has been careful not to imply anywhere
else in this project. The `/verify` page's own copy is explicit about
the boundary already: "This confirms the file existed, unaltered, as of
a [timestamp], sealed by a verified individual. It doesn't certify the
file's contents weren't AI-generated — only that it hasn't changed since
this timestamp." A button labeled "Download IP Certificate" sitting
right next to that same honest disclaimer would read as a contradiction
to anyone who reads both.

If "IP" was meant as **integrity/provenance** shorthand rather than
intellectual property, worth an explicit rename before this ships — a
few options that say what the document actually proves without the
IP-ownership implication: "Download Certificate of Authenticity",
"Download Verification Certificate", or reusing the app's own existing
term, "Download Certificate of Completion" (already the on-screen label
for the non-sealed case, `verify/page.tsx` line 99). Not deciding this
here — flagging it as a real pre-ship question, same class of catch as
the RFC 3161/eIDAS-wording reviews earlier in this project.

## Addendum: due-diligence dataroom certificate variant (2026-08-03)

Follow-up ask: a one-page, "legally sterile" version of this
certificate specifically meant to sit inside a corporate data room next
to NDAs and cap tables, with four required elements. Checked each
against the actual system rather than assuming; two are ready, two have
real gaps worth resolving before this ships.

**Asset Cryptographic Identity (filename, file size, SHA-256 hash) —
partial.**
- Hash: **decided 2026-08-03 — drop the SHA-256 requirement, label the
  certificate's hash as SHA-512.** This matches what the system
  actually produces for every document sealed today (SHA-256 only
  survives on certificates issued before the SHA-512 switch,
  `isValidDocumentHash` in `/api/verify/hash.ts`), so the certificate
  states the true, current hash rather than computing a second,
  redundant SHA-256 purely for label-matching. No extra hash pass
  needed.
- Filename: no clean stored "original filename" field exists.
  `documents.title` is the closest thing but it's a display title —
  user-editable, AI-generated for drafted documents, not guaranteed to
  equal the literal uploaded filename. Fine to use as a stand-in, worth
  knowing it isn't a strict filename field.
- File size: not stored anywhere today. Cheap to add without a
  migration — an R2 HEAD request against the file at generation time
  returns Content-Length directly.

**Verified Origin (legally verified name, eIDAS alignment) — the name
is ready, the eIDAS claim isn't an engineering decision.** The
identity-verified signer name (`sealedBy`) is already surfaced for
Verified Badge documents and is safe to print as-is. "Aligning with
eIDAS standards for European legal certainty" is a different, bigger
claim: eIDAS has tiered identity-assurance levels (Low/Substantial/High)
and a formal "qualified trust service provider" designation — Stripe
Identity (government ID + selfie) is real KYC-grade verification, but
it is not a certified, eIDAS-notified eID scheme. This is the same
class of open item as the RFC 3161/DPA eIDAS framing already flagged in
[[legal-pages-subprocessors]] for the next legal meeting — not
resolved here, not asserted on the certificate. The certificate can
state what actually happened (identity verified via Stripe Identity, on
a given date) without claiming a specific EU regulatory alignment that
hasn't been reviewed.

**Immutable Timestamp — ready.** This is exactly what the RFC 3161
build already provides (`timestampTsa`/`timestampGenTime`,
[[rfc3161-timestamp-build]]) — exact UTC sealing time, cryptographically
bound. Only gated on that feature actually being deployed (still owed)
and on the document having gone through it; pre-RFC-3161 documents have
no token to show.

**Statement of Integrity — mostly ready, one phrase flagged.**
"The cryptographic hash confirms the file has not been altered since
sealing" is accurate boilerplate, safe to use. "Chain-of-custody
ledger from creator to client" is a stronger, specific evidentiary term
implying a documented possession trail; SignedBy logs sealing/
completion events, not a formal chain of custody in that sense. Same
treatment as the eIDAS item — flagged, not rewritten unilaterally;
a softer alternative ("an integrity record from sealing through
verification") would say the true thing without borrowing forensic
terminology.

**Net: hash format is now decided (SHA-512, no extra work); file size
is a small, contained addition; the two remaining open items are legal
wording, not engineering.** File size needs one R2 HEAD request, no
migration. The eIDAS and chain-of-custody wording are legal-copy
questions in the same category already tracked for the next legal
meeting — this addendum doesn't resolve them, just keeps them from
getting silently asserted on a document meant to sit next to NDAs and
cap tables.

## Explicitly out of scope

- **Persisting the generated PDF anywhere** — generate-on-request only;
  no new storage, no new column.
- **Any change to the existing authenticated `/api/v1/documents/[id]/certificate`
  route** — untouched, different audience (an org's own API-key holder),
  different data shape.
- **A downloadable certificate for an unverified/no-match hash** — the
  button only ever appears after a real match, same gating the page's
  existing result blocks already use.
- **Asserting eIDAS regulatory alignment or "chain-of-custody" as a
  legal term on the certificate** — both need legal review before
  wording ships, per the addendum above; not decided or built here.

## Effort

Small-to-medium for the base certificate; the dataroom variant adds a
small amount of work on top (one R2 metadata call for file size, no
extra hash pass now that the hash format is settled on SHA-512), not a
size-class change. The generation code is genuinely new
(deliberately not reusing the existing signer-PII-bearing generator),
but it's a straightforward one-page PDF draw from data the app already
has in hand at that point in the request — no new migration, no new
third-party integration, no auth model change (still anonymous, still
hash-as-credential, same trust model `/api/verify` already
established). Comparable in size to the RFC 3161 badge-QR addition to
the certificate page ([[timestamp-authority-scope]]'s "Related, smaller
addition"). The eIDAS/chain-of-custody wording is not an effort
question — it's blocked on legal review, independent of build size.
