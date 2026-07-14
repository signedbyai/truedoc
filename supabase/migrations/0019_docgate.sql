-- DocGate (Business tier, external-link approach — same shape as
-- 0010_payment_collection.sql). An org pastes a link they already own and
-- have shared appropriately (e.g. a Google Drive link); it's released to
-- every signer only once the *whole document* is completed, via a
-- per-signer unguessable redirect code. Click events land in audit_events
-- (device type + coarse location from Vercel's geo headers), giving the
-- sender an engagement timeline for the underlying asset.

alter table documents add column if not exists docgate_url text;
alter table documents add column if not exists docgate_label text;
alter table templates add column if not exists docgate_url text;
alter table templates add column if not exists docgate_label text;

-- Every signer gets an unguessable code, same pattern as signing_token —
-- unused (and harmless) on documents that never set docgate_url.
alter table signers add column if not exists docgate_code uuid not null default gen_random_uuid();
create unique index if not exists signers_docgate_code_idx on signers (docgate_code);

alter table audit_events drop constraint if exists audit_events_event_type_check;
alter table audit_events add constraint audit_events_event_type_check
  check (event_type in (
    'created', 'sent', 'viewed', 'consent_given', 'signed', 'declined',
    'completed', 'voided', 'payment_link_clicked', 'docgate_clicked'
  ));
