# Bulk document zip export (async, up-to-24h) — scope

Scope only, not built (2026-08-07, direct ask, split out from the combined
[[signer-export-and-document-zip-scope]] doc into its own file — sibling
to [[signer-export-scope]] and [[auto-frequent-signers-scope]], but
technically unrelated to either: this one is about R2/file infrastructure,
not the `signers` table). **Design direction confirmed this pass:** an
async job with an up-to-24-hour completion expectation, not a synchronous
download — this resolves the B1-vs-B2 question the original combined doc
left open in favor of B2.

## Why async, not synchronous — recap of the constraint that forced this

`getFromR2()` (`src/lib/r2.ts`) fully buffers each file into memory —
fine one file at a time, not viable across an org's entire document
history in one request/response cycle. A single Vercel function
invocation has real execution-time limits, the same class of constraint
that already forced Console's bulk-send feature into an explicit
time-budget pattern. A synchronous "click and download" experience would
either need a hard document-count cap (declining large orgs outright) or
risk silently timing out. An async job removes that ceiling entirely —
work can be spread across as many small steps as needed.

## Design

**New table, e.g. `document_export_jobs`:** `id`, `org_id`,
`requested_by` (user id), `status` (`queued` / `processing` / `ready` /
`failed`), `zip_r2_key` (nullable, set once built), `total_documents`,
`processed_documents` (progress, resumable across cron ticks),
`created_at`, `completed_at`, `expires_at` (the download link's own
expiry, separate from how long the job took to build).

**Processing: a modest-cadence cron, not a queue/worker system.** Given
the up-to-24-hour expectation, there's no need for the aggressive
real-time processing Console's bulk-send or a synchronous download would
need — a cron tick every few minutes (mirroring the existing
`/api/cron/reminders`/`/api/cron/admin-digest` pattern, same
`CRON_SECRET`-protected shape) picks up `queued`/in-progress jobs and
processes a bounded batch of documents per invocation (respecting its own
safe time budget per tick, same reasoning as Console bulk-send's 45s
pattern), advancing `processed_documents` and resuming on the next tick
rather than needing to finish in one shot. **Realistic expectation, worth
being honest about in the UI copy:** most orgs (a handful to a few dozen
documents) would likely finish within minutes to an hour at a reasonable
cron cadence — 24 hours is a safe worst-case ceiling for a very large
org's export, not the typical wait. Copy should say something like "we'll
email you a link when it's ready" rather than literally promising every
user a day-long wait; whether 24 hours is stated anywhere as a hard
customer-facing SLA or kept as an internal design ceiling is an open
decision (recommend: internal ceiling only, not a published promise —
avoids over- or under-selling the real, variable experience).

**Building the zip without buffering everything in memory:** stream
each document's file into the zip archive (`archiver`, a new dependency —
no zip library exists in the codebase today) and upload the growing
archive to R2 via a multipart upload rather than assembling the whole
zip in one process's memory before a single `PutObjectCommand` — R2 (S3-
compatible) supports multipart upload for exactly this large-object-
built-incrementally case. This is real new plumbing this codebase doesn't
have a precedent for yet (every existing R2 write is a single small
`PutObjectCommand`), the main piece of genuinely new infrastructure here.

**Delivery:** a new `sendDocumentExportReadyEmail()` (sibling to the
existing `email.ts` functions), containing a **presigned, time-limited R2
GET URL** — `r2.ts` only has a presigned-PUT helper today
(`getSignedUploadUrl`, used for direct browser uploads); a presigned-GET
equivalent is a small, symmetrical addition. Link expiry (e.g. 7 days)
should be shorter than indefinite, matching the general practice of not
leaving sensitive bulk-document archives downloadable forever.

**Cleanup:** the built zip shouldn't live in R2 past its link's expiry —
either the same cron (on each tick, delete any `ready` job past
`expires_at`, reusing `deleteFromR2`) or a separate scheduled sweep.
Needed so this feature doesn't silently accumulate storage cost per
export request forever.

## Open decisions

1. **Which file per document** — the signed/certificate version
   (`signed_file_path`, what a client actually received) is the obvious
   default. Whether to also include the original pre-signature upload,
   and what to do with documents that have no `signed_file_path` yet
   (drafts, sent-but-incomplete) — include as the original-only, or skip
   entirely — needs an explicit answer, not silent skipping that could
   read as a bug.
2. **Re-request behavior.** If an org requests a new export while one is
   already `queued`/`processing`, does the new request queue behind it,
   get ignored with a "one's already running" message, or cancel and
   restart the existing one? Recommend: block a second request while one
   is in flight, surfaced in the UI rather than silently queuing a
   duplicate.
3. **Access/notification** — does the completion email go only to
   whoever clicked the button, or to every org member (relevant for
   Team/Business orgs)? Recommend: requester only, matching how most
   other org actions in this codebase are attributed to the acting user
   rather than broadcast.
4. **24-hour framing** — internal design ceiling only (recommended) vs.
   a stated customer-facing promise, per the honesty note above.

## Effort (rough)

Moderate-to-large — this is the one piece of the three split-out docs
that needs genuinely new infrastructure this codebase doesn't already
have a version of: a job-status table, a new cron route, streaming
zip-to-multipart-upload logic, and a presigned-GET helper. Meaningfully
bigger than [[signer-export-scope]] or [[auto-frequent-signers-scope]],
both of which reuse entirely existing patterns.

## Status

Scoped only, not built, per [[feedback-scope-means-scope-only]]. Worth
checking real document-count-per-org distribution before picking cron
batch-size/cadence numbers, so they're grounded in actual scale rather
than guessed.
