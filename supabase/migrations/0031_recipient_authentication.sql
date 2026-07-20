-- Per-recipient authentication (Business tier): a sender can require a
-- signer to enter a one-time email code before the signing link opens the
-- document, strengthening dispute-resistance without claiming full AES/QES.
-- See PER_RECIPIENT_AUTH_SCOPE.md (project root) for the full scope.

alter table signers add column if not exists auth_required boolean not null default false;
alter table signers add column if not exists auth_code_hash text;
alter table signers add column if not exists auth_code_expires_at timestamptz;
alter table signers add column if not exists auth_verified_at timestamptz;
-- Failed-attempt counter against the current code only — reset to 0 every
-- time a fresh code is issued. Caps brute-forcing a 6-digit (1-in-a-million)
-- code before it expires; see src/app/api/sign/[token]/auth/verify/route.ts.
alter table signers add column if not exists auth_attempts int not null default 0;

-- Also widens the event_type check to add 'expired' (documents.expires_at,
-- migration 0030 — that migration's cron code inserts this event type but
-- never widened the constraint, an oversight caught while building this
-- feature) and 'identity_verified' (this feature's own audit trail entry).
alter table audit_events drop constraint if exists audit_events_event_type_check;
alter table audit_events add constraint audit_events_event_type_check
  check (event_type in (
    'created', 'sent', 'viewed', 'consent_given', 'signed', 'declined',
    'completed', 'voided', 'payment_link_clicked', 'docgate_clicked',
    'recipient_corrected', 'expired', 'identity_verified'
  ));
