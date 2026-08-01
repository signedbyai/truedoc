# Blockchain anchoring (OpenTimestamps) — scope

Status: SCOPED 2026-08-01, not built. Second of two follow-ons from the
badge-copy audit (see [[timestamp-authority-scope]] /
`TIMESTAMP_AUTHORITY_SCOPE.md` for the first) — that one makes the
"cryptographically verified timestamp" claim true by trusting a TSA;
this one is a genuinely different property: a proof that survives
SignedBy's own infrastructure disappearing, not just SignedBy's claim
being honest today.

## Why this one

Not speculative — checked real competitors before writing this doc.
**Zoho Sign**, a mainstream e-signature product in the same tier as
SignNow/PandaDoc, ships a live "Blockchain-based timestamping" feature:
hash the signed document, anchor the hash via OpenTimestamps on the
Bitcoin blockchain, publicly verifiable by anyone with zero dependence
on Zoho staying in business. **Woleet** is a whole company built around
the same idea, with real enterprise customers (Kering, EDF, Servier).
Checked SignNow, PandaDoc, Dropbox Sign, DocuSign, and Adobe — none of
them do this; they stick to conventional PKI/RFC-3161-style
timestamping. So this is a genuine, provable "almost nobody in
SignedBy's actual peer set does this" claim, not a catch-up move or an
unproven idea.

## What it actually proves — different from the RFC 3161 scope

RFC 3161 (the other scope doc) still asks a verifier to trust one
specific TSA's signature and continued existence — or a QTSP
relationship for real legal weight. OpenTimestamps' trust surface is
close to zero: the hash is batched into a Merkle tree with everyone
else's, the root gets embedded in a real Bitcoin transaction (an
`OP_RETURN` output), and verifying later needs nothing from SignedBy,
no TSA, no calendar server even — just the small `.ots` proof file and
Bitcoin's own public block headers. That's the actual "continuity"
property: even if SPRK10 B.V. or signedby.ai disappeared entirely, a
document sealed this way still independently verifies, forever, with
open-source tools anyone can run. The two scopes are complementary, not
competing — could ship either alone or both.

## Library

`opentimestamps` on npm (formerly `javascript-opentimestamps`) — the
official reference implementation from the OpenTimestamps project
itself, confirmed real by reading its actual README. Node and browser
compatible, promise-based API: `stamp()`, `info()`, `verify()`,
`upgrade()`. Can stamp a pre-computed hash directly
(`DetachedTimestampFile.fromHash`) — no need to re-hash, reuses the
same SHA hash SignedBy's sealing pipeline already computes.

Two things worth flagging before building on it:
- **License is LGPL3, not MIT** — a different class than `pdf-rfc3161`
  and most of this codebase's other dependencies. Fine to use as a
  library dependency (doesn't require SignedBy's own code to be
  open-sourced), but worth being accurate about if OSS license
  compliance is ever actually audited.
- **Less recently active than `pdf-rfc3161`** — its README's own
  examples reference Node 6/7 compatibility testing. The core
  OpenTimestamps protocol itself is stable (it's a thin client over a
  simple, unchanging wire format), but this specific package deserves
  an actual smoke test in the sandbox before being trusted, not just
  assumed current the way `pdf-rfc3161`'s actively-versioned repo was.

## The two-phase problem: pending vs. confirmed

This is the part that makes this a real engineering feature, not just
an API call. `stamp()` submits the hash to remote calendar servers and
returns quickly — but that result is only a *pending* attestation
(trusting the calendar servers, not yet Bitcoin itself). The calendar
servers batch submissions and anchor a Merkle root in a real Bitcoin
transaction on their own schedule; getting the fully independent,
trust-nobody Bitcoin proof requires calling `upgrade()` again *later*,
once that transaction has confirmed — realistically hours after the
original seal, not seconds.

**Concretely, this means sealing can't finish this step synchronously.**
Needed: a background job that periodically calls `upgrade()` on every
document with a still-pending OpenTimestamps proof, and flips it to
confirmed once Bitcoin has it. `document-expiration-feature`'s existing
daily reminders cron ([[document-expiration-feature]]) is the precedent
for "this codebase already has a place to run scheduled jobs" — extend
that pattern rather than building new cron infrastructure from scratch.

**UI/copy consequence:** the badge, certificate page, and `/verify` all
need a real "pending" state, not just a boolean "has a blockchain
proof." A document sealed five minutes ago legitimately doesn't have
its final Bitcoin-anchored proof yet — the copy has to say so honestly
rather than implying instant blockchain confirmation, the same honesty
standard the rest of this feature is built on.

## Where the proof has to actually live

The whole point of this feature is "still verifies even if SignedBy is
gone" — which means the `.ots` proof file **cannot only live in
SignedBy's own Supabase.** If it does, the continuity claim is false;
verifying it would still require asking SignedBy's server for the
proof file, defeating the purpose. Two things need to be true:

1. The proof needs to be embedded in or attached to the actual file the
   customer keeps — not just referenced by a database row. Confirmed
   the concrete mechanism, not just the requirement: `pdf-lib`
   (already a dependency, already used throughout
   `generate-signed-pdf.ts`) has a real `PDFDocument.attach(bytes, name,
   options)` method for embedding a file attachment directly into a
   PDF — the same technology behind Acrobat's paperclip-icon
   attachments. The raw `.ots` bytes get attached this way to the
   certificate page, so anyone holding the PDF holds the proof, no
   server call required to extract it.
2. It should also be offered as its own downloadable artifact, extending
   the existing "what comes back" pattern Verified Badge already uses
   (sealed file, badge image, verify URL — see
   [[verified-badge-build]]) with a fourth item: the raw `.ots` proof,
   for anyone who wants to verify independently of signedby.ai
   entirely, using OpenTimestamps' own open-source tools.

**Placement matters, and it isn't arbitrary.** The attachment has to
live on the certificate page, appended strictly *after* the point
where the SHA-512 hash is computed — the same spot the existing QR/
badge and hash text already occupy (`generate-signed-pdf.ts` computes
`hash` over the stamped content *before* `addCertificatePage` runs).
Anything added after that boundary can never retroactively change what
was actually hashed and anchored.

**This is what makes the pending→confirmed swap safe.** At seal time,
the PDF ships with the *pending* `.ots` attached (immediate, but only
calendar-server-attested). Once the background `upgrade()` job later
confirms the Bitcoin anchor, the certificate page gets regenerated with
the upgraded, fully-verifiable proof swapped in, and the PDF is
re-uploaded to R2. Because the attachment lives strictly after the hash
boundary, re-generating that one page and re-embedding a richer proof
never touches the bytes that were actually hashed — nothing already
anchored gets invalidated by the later swap.

**What actually makes the resilience claim true:** a customer (or
anyone) can take the PDF or the standalone `.ots` file to any
independent OpenTimestamps verifier — the CLI, a third-party web tool,
anything speaking the open protocol — and confirm it against Bitcoin's
public chain directly, no call to signedby.ai involved. `/verify`
still does this automatically as a convenience for the ordinary case,
same as today, but the proof's actual validity never depends on that
page, or SignedBy, existing.

## How this fits existing code

- Same hash already computed in `generate-signed-pdf.ts` /
  `verified-badge-actions.ts` (SHA-512) is the input — stamp the hash
  directly, no new hashing step.
- New data: `document_hash` already exists on `audit_events`; needs a
  home for `ots_proof` (bytea, the serialized proof — re-serialized
  after every `upgrade()` call since the proof grows richer over time),
  `ots_status` (`pending` / `confirmed` / `failed`), `ots_confirmed_at`.
- New: the upgrade-cron job described above — genuinely new
  infrastructure shape for this codebase (a job that revisits old rows
  on a schedule looking for state changes), not a variation on anything
  that exists today.
- New download route for the `.ots` file itself, same shape as the
  existing `/api/documents/[id]/{badge,certificate}` routes.

## Explicitly out of scope

- **Multi-chain anchoring (Ethereum, etc.)** — Zoho Sign's own history
  argues against this: they shipped Ethereum anchoring and later
  discontinued it. Bitcoin-only keeps this simpler and matches
  OpenTimestamps' primary, best-supported chain.
- **Real-time verification** — the pending/confirmed delay is
  structural, not an implementation gap to fix.
- **OriginStamp (paid alternative)** — anchors in ~24h instead of
  OpenTimestamps' variable delay, for a price. Not needed for v1; worth
  revisiting only if the pending-state UX turns out to be a real
  customer complaint.
- **Bundling with the RFC 3161 timestamp scope** — related, but
  independent enough to ship either one alone.

## Effort

Medium — bigger than the RFC 3161 scope, smaller than Verified Badge
itself. The stamping call is small; the pending→confirmed background
job and the "the proof has to leave the building" distribution
requirement are genuinely new infrastructure shapes this codebase
doesn't already have an equivalent of, unlike the RFC 3161 scope which
slots cleanly into an existing synchronous step.

## Decisions (2026-08-01)

1. **Bitcoin-only**, not multi-chain — see Zoho's own Ethereum-support
   discontinuation above.
2. **Free OpenTimestamps calendar servers**, not paid OriginStamp, for
   v1.
3. **The `.ots` proof must be distributable to the customer**, not only
   stored server-side — non-negotiable for the continuity claim to
   actually be true, not just asserted.

## Open questions

- **Scope of application** — every sealed/signed document (matching the
  RFC 3161 scope's own default, and the existing badge/QR addition's
  precedent of applying broadly) or Verified-Badge-only first? The
  pending-state UX adds real complexity that might argue for narrowing
  to Verified Badge alone for a first version, unlike the RFC 3161 case
  where applying broadly cost nothing extra.
- **How "pending → confirmed" surfaces to the user** — a Console chat
  notification once confirmed, a passive status on `/verify` someone
  has to come back and check, or something else? Not resolved here.
- **Does the Badge visual itself need a QR/link to the `.ots` proof**,
  or is that too technical for the badge and better left as a
  "for developers / for verification" download link elsewhere on the
  ledger page? Leaning toward the latter — the badge is meant to read
  as legitimate at a glance, not to teach someone what OpenTimestamps
  is.
