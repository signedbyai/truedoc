-- Contract end-date reminder (CONTRACT_END_DATE_REMINDER_SCOPE.md,
-- lawyer discovery-call feedback 2026-08-17/23). NOT the same thing as
-- expires_at (migration 0030) -- that's a pre-signature deadline for
-- draft/sent documents; this is the underlying contract's own
-- substantive end/term date, set on a document at any status (most
-- often after it's completed), with two lead-time email reminders
-- rather than any status change. Free on every plan, any tier -- no
-- plan check needed on the write path or the cron read.
--
-- Plain `date`, not `timestamptz`: a contract term-end is naturally a
-- calendar date, not a specific moment, and this avoids the
-- timezone-conversion UI complexity expires_at's modal needed.
alter table documents add column if not exists contract_end_date date;

-- Two independent dedupe markers, one per reminder (1 month out, 1 week
-- out) -- decided 2026-08-23: "2 reminders -- 1 reminder 1 month out and
-- 1 reminder 1 week out". Both cleared whenever contract_end_date
-- changes (see the API route), so an edited date gets a fresh reminder
-- cycle instead of silently skipping a stage it technically "already
-- sent" against the old date.
alter table documents add column if not exists contract_end_date_reminder_30_sent_at timestamptz;
alter table documents add column if not exists contract_end_date_reminder_7_sent_at timestamptz;
