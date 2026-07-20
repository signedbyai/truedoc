-- Optional sender-set expiration for a document that's out for signature.
-- Enforced by the existing reminders cron (src/app/api/cron/reminders/
-- route.ts), which now also sweeps "sent" documents past their expires_at
-- and flips them to the new 'expired' terminal status before doing its
-- normal reminder pass -- rides the same daily Vercel Cron trigger, no new
-- infrastructure. Free on every plan (not gated), matching recipient_notice/
-- invite_subject/invite_message.
alter table documents add column if not exists expires_at timestamptz;

-- Widen the status CHECK constraint to add 'expired', alongside the
-- existing draft/sent/completed/declined/voided. Same drop-and-re-add
-- pattern as migration 0016 (widening ai_provider's constraint): dropping
-- Postgres's auto-generated name for an unnamed column check
-- ("<table>_<column>_check") and re-adding it with the wider list is safe
-- to re-run.
alter table documents drop constraint if exists documents_status_check;
alter table documents add constraint documents_status_check
  check (status in ('draft', 'sent', 'completed', 'declined', 'voided', 'expired'));
