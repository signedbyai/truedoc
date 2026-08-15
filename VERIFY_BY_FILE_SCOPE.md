# Verify by file — drag-and-drop hash check on /verify — scope

Status: **scoped 2026-08-13, not built.** Answering the open questions below
is not approval to build — see [[feedback-scope-means-scope-only]].

## Why

Direct question, 2026-08-13: *"What's really needed to secure an invoice.
Can't anyone generate a seal and add it to a pdf?"*

Yes, anyone can. The Verified Badge is an image; nothing prevents someone
screenshotting one or drawing a lookalike and pasting it on any PDF. That's
not a defect — the badge is a signpost, and the actual security primitive is
the hash behind it.

The gap is what happens next. `/verify` today confirms:

> a document with hash H was sealed by X at time T

It does **not** confirm:

> the PDF in your hand is that document

Those only connect if the person checking recomputes the hash of the file
they actually received. Today `/verify` accepts a **pasted checksum only** —
so it asks someone to locate the checksum on the certificate page and type
128 hex characters. Effectively nobody will. In practice a recipient scans the
QR, sees a green tick, and pays.

That makes a **copy-the-badge attack** viable against an inattentive
recipient: lift a real badge off a genuine sealed invoice, paste it onto a
fraudulent one, and the QR resolves to a real, green, "genuine" record. The
only tell on the current page is the filename, which is weak evidence.

Letting someone **drop the PDF onto /verify** and hashing it in the browser
closes this. It turns the page from *trust this QR* into *prove this file*.

## The blocker: the stored hash is not the hash of the distributed file

This is the finding that makes the feature more than "add a file input", and
it needs resolving before anything is built.

| Path | `document_hash` is computed over | What the recipient actually receives | Hashing the received file matches? |
|---|---|---|---|
| Signed documents (`generate-signed-pdf.ts:194-195`) | `stampedBytes` — after field stamping, **before** the certificate page is appended and **before** the RFC 3161 timestamp | `uploadBytes` = timestamped(stamped + certificate page) | **No** |
| Seal, `certificateMode: "separate"` (`verified-badge-actions.ts:~210`) | `originalBytes` — the raw upload, byte-for-byte untouched | the untouched original | **Yes** |
| Seal, `appended` / `both` | `stampedBytes`, via `generateSignedPdf` | stamped + certificate page + timestamp | **No** |

So for the majority of documents, hashing the file the recipient holds gives a
different value than the one stored — and a naive implementation would tell
honest users their genuine document is unverifiable. Worse than not shipping.

The existing choice is deliberate and correct, and must not be changed:
hashing before the certificate page avoids the circularity of a hash covering
the page that reports it, and `generate-signed-pdf.ts`'s own comment is
explicit that the stamped content "is the part that actually carries legal
meaning." Every certificate ever issued carries that hash. Repointing it would
invalidate all of them.

## What to build

**1. Store a second hash of the distributed artifact.** New column, e.g.
`documents.distributed_file_hash`, computed over the exact bytes uploaded to
R2 — `uploadBytes` in `generate-signed-pdf.ts` (post-timestamp, the true final
artifact), and the equivalent in each seal branch. Purely additive:
`document_hash` keeps its current meaning and every issued certificate keeps
verifying.

Note the seal `separate` branch distributes two artifacts (the untouched
original and a standalone certificate PDF). Decide whether both get a
distributed hash, or only the original — the original is what a client
actually receives attached to an invoice.

**2. Accept a dropped file on `/verify`.** Read it with `FileReader`, hash
with `crypto.subtle.digest("SHA-512", buf)` in the browser, then query the
existing lookup with the result. **No upload** — the file never leaves the
device, which keeps this clear of both the bandwidth cost and the privacy
question entirely. `SubtleCrypto` needs a secure context; signedby.ai is
HTTPS, so that's satisfied.

**3. Query both hashes.** A dropped file should match if it equals *either*
`document_hash` (covers `separate`-mode seals and anyone who kept the
pre-certificate artifact) or `distributed_file_hash`. The pasted-checksum path
stays exactly as it is.

**4. Backfill.** Existing documents have no distributed hash. Either a
one-off script that re-fetches each `signed_file_path` / `certificate_file_path`
from R2 and hashes it, or compute lazily on the first failed file-verify and
cache. The script is cleaner and the volume is currently trivial.

## Copy — this is the part most likely to cause harm

A false "this file does not match" on a genuine document is worse than no
feature at all. Real, benign causes exist: some mail gateways and document
scanners re-save PDF attachments, and any re-save changes the bytes without
changing a single visible character.

So the negative result must **not** say "this document has been altered."
It should say something closer to *"we couldn't match this exact file"*, and
explain that a match proves the file is byte-identical to the sealed one,
while a non-match can mean either a changed document **or** a file that's been
re-saved somewhere in transit — with the checksum-paste route offered as the
fallback check.

The positive result is the one that's worth stating strongly, because it's
genuinely strong: *this exact file is the one that was sealed.*

## What it does and doesn't prove

Proves: the bytes in front of you are identical to the bytes sealed at time T
by an identity-verified person, per an independent RFC 3161 timestamp.

Does **not** prove: that the invoice is legitimate, that the bank details on
it are right, or that the sealer is trustworthy. It also can't help with a
printed or rescanned copy — no hash approach can.

And it doesn't stop a fake invoice being sent. It makes the genuine one
checkable, which is the honest claim the FAQ already makes and which should
not drift.

## The heavier alternative, for the record

Embedding a real cryptographic signature in the PDF (PAdES / eIDAS AdES)
instead of a visual badge would let Acrobat and Preview validate it natively,
with no visit to signedby.ai at all. That's the ceiling, and what competitors
claiming AdES offer. Much larger lift — certificate authority relationship,
key management, legal review — and out of scope here. Worth noting this scope
is the cheap 80% of the same benefit.

## Open questions

- Does the drop zone belong on `/verify` only, or also on the public ledger
  page a QR scan lands on? The scan case is where the copy-the-badge attack
  actually plays out, so putting it *only* on `/verify` may miss the moment
  that matters.
- Should a non-match be logged (rate-limited, hash only, no file)? It would
  be the first signal you'd ever get that badge-copying is happening at all —
  but it's a new processing activity and needs the usual privacy check.
- `separate`-mode seals: hash the original, the certificate, or both?
- Backfill script now, or lazy-on-miss?
