# Contract end-date reminder — scope (NOT approval to build)

Status: **scoped only, 2026-08-23**, from real feedback on lawyer
discovery calls the week of 2026-08-17 (see [[lawyer-vertical-discovery]]
in project memory). Two lawyers independently named this as a pain point
in their current workflow.

## What this is, and what it explicitly is NOT

This is a reminder tied to the **contract's own substantive end/term
date** — e.g. a lease's "valid until" date, an agreement's term-end date
— something a lawyer wants to track on a document that has already been
**signed and completed**, so they don't miss a renewal or renegotiation
window.

This is a different feature from the existing `expires_at` /
[[document-expiration-feature]] (`documents.expires_at`, shipped
2026-07-20). That field is a **pre-signature deadline**: it only applies
to `draft`/`sent` documents, and the daily cron flips the document to a
terminal `expired` status if nobody signs before it. It says nothing
about the contract's own terms and doesn't touch `completed` documents at
all. An earlier pass in project memory conflated the two — corrected
2026-08-23, see [[lawyer-vertical-discovery]] for the correction.

**Do not build this by extending `expires_at` or `expireOverdueDocuments()`
directly** — the semantics are different enough (applies to completed
docs, never changes document status, needs a lead-time reminder rather
than an on-the-day status flip) that it should be its own field and its
own cron pass, even though it reuses the same daily-cron/email
infrastructure underneath.

## Proposed data model

New nullable column, e.g. `documents.contract_end_date timestamptz` (or
`date`, if time-of-day is never meaningful for a contract term — worth a
quick call, `date` is simpler and probably right). Unlike `expires_at`,
this should be settable regardless of document status — a sender might
know the contract's term length before it's even signed, or add it
retroactively to an already-completed document (the exact case the
lawyers described: tracking an *existing* signed contract).

Needs a second column to avoid duplicate reminder sends, matching the
`last_reminder_at` pattern already used for the signer-nudge cron:
`documents.contract_end_date_reminder_sent_at timestamptz`, cleared
whenever `contract_end_date` is changed so an edited date gets a fresh
reminder cycle.

Next free migration number is `0060` (last used: `0059_api_usage.sql`).

## Proposed UI surface

`expires_at` is set via a modal in `field-editor.tsx`'s "More" menu —
that's the pre-send compose flow and isn't the right place here, since
this field matters most on documents that are already `completed` (see
`src/app/dashboard/documents/[id]/page.tsx`, which already branches on
`doc.status === "completed"` around line 120 and already selects
`expires_at` into its query — `contract_end_date` would be added to that
same select string).

Likely simplest: a small editable field on the document detail page
itself (reusing the existing editable-in-place pattern already used
twice in `field-editor.tsx` for the payment-link and DocGate URL editors
— boolean state + input + Save/Cancel — the same pattern
`RECIPIENT_INLINE_EDIT_SCOPE.md` reused most recently), shown for
completed documents and probably also available (lower visual priority)
on draft/sent documents for the sender who wants to set it up front.

## Proposed reminder mechanism

Reuse the existing daily Vercel Cron (`src/app/api/cron/reminders/route.ts`,
already runs once a day, already has the `expireOverdueDocuments()`
pattern to copy structurally) — add a new function, e.g.
`remindUpcomingContractEndDates()`, run alongside (not instead of) the
existing expiration sweep and signer-nudge pass. Query shape: documents
where `contract_end_date` is within the lead-time window, `status =
'completed'`, and `contract_end_date_reminder_sent_at` is still null (or
older than the current `contract_end_date`, per the invalidate-on-edit
note above). Send via a new `sendContractEndDateReminderEmail()` in
`src/lib/email.ts`, same shape as `sendDocumentExpiredEmail()` — subject
along the lines of `"<title>"'s contract term ends soon`, link to the
document, CTA to review/renew.

## Decisions — Michael, 2026-08-23

1. **Lead time: 1 month (30 days) before `contract_end_date`.**
2. **Two reminders, not one**: one at T-minus-1-month, a second at
   T-minus-1-week. This changes the reminder mechanism from the single
   lead-time email originally proposed above to two distinct sends —
   needs two dedupe markers (or one column tracking which of the two has
   fired, e.g. `contract_end_date_reminder_sent_at` +
   `contract_end_date_final_reminder_sent_at`, or a small
   `contract_end_date_reminders_sent` jsonb/text[] if more stages get
   added later) so the cron doesn't re-send either one, and both still
   clear on edit per the invalidate-on-edit note above.
3. **Gating: any tier can use it** — free on every plan, no plan check
   needed on the write path or the cron read.
4. **`date` vs `timestamptz`**: still leaning `date`, not decided by
   Michael explicitly — flag before building, low-stakes either way.
5. **CMS-integrations interaction**: still out of scope for v1, per the
   original reasoning above.

**Scope is now settled enough to build** (lead time, reminder count, and
gating were the load-bearing open questions) — not started yet, this is
still a scoping pass per [[feedback-scope-means-scope-only]]; say the
word when ready to build.

## Effort estimate

Comparable in size to the original `expires_at` build — one migration,
one new cron function reusing existing infra, one new email template, one
new UI surface. Cheap relative to its signal: this is the single item on
the current punch list with the most direct, unprompted validation from
real prospects in the target segment.

## Non-goals for v1

No recurring/multi-stage reminder schedule beyond a single lead-time
email. No auto-detection of contract terms from uploaded PDF content (AI
extraction of an end date from the document text is a plausible future
enhancement, not scoped here — this is manual sender input only). No
two-way sync with any external CMS/practice-management tool.
