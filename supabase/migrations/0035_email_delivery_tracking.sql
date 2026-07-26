-- Email delivery visibility (BOUNCE_TRACKING_SCOPE.md). Lets the sender see
-- when an invite email bounced instead of it looking identical to "hasn't
-- opened it yet". Deliberately NOT touching signers.status -- that column
-- drives real routing logic (sequential signing order, who's "current"),
-- and a delivery problem is orthogonal to signing progress: a bounced invite
-- doesn't mean declined or completed, it means the signer never got it. Same
-- reasoning as widening ai_provider/documents_status/audit_events' CHECK
-- constraints in prior migrations rather than repurposing an existing column.
--
-- last_email_id is the Resend message id from the most recent send to this
-- signer (captured at send time, going forward -- see lib/email.ts), used to
-- correlate an async Resend webhook event back to the right signer row.
-- last_email_event is Resend's most recently reported delivery state for
-- that send. Tracking only the latest send (not a full history table) is
-- the proportionate scope here -- a signer only ever needs one answer ("is
-- their current invite link stuck"), not a timeline.
alter table signers add column if not exists last_email_id text;
alter table signers add column if not exists last_email_event text;
alter table signers add column if not exists last_email_event_at timestamptz;

alter table signers drop constraint if exists signers_last_email_event_check;
alter table signers add constraint signers_last_email_event_check
  check (last_email_event is null or last_email_event in (
    'sent', 'delivered', 'delayed', 'bounced', 'complained', 'suppressed', 'send_failed'
  ));

create index if not exists signers_last_email_id_idx on signers (last_email_id);
