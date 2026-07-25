-- Client-side load-failure visibility (2026-07-25 follow-up to
-- DOCUMENT_DELIVERY_SECURITY_AUDIT.md): a signer's PDF failing to load in
-- their browser was previously invisible outside their own devtools
-- console -- no server log, no audit trail, nothing queryable. Widens the
-- event_type check to add 'client_load_error' so
-- src/app/api/sign/[token]/client-error/route.ts can log it to the
-- existing audit_events table (same pattern as payment_link_clicked/
-- docgate_clicked -- a lightweight best-effort beacon, not a new table).

alter table audit_events drop constraint if exists audit_events_event_type_check;
alter table audit_events add constraint audit_events_event_type_check
  check (event_type in (
    'created', 'sent', 'viewed', 'consent_given', 'signed', 'declined',
    'completed', 'voided', 'payment_link_clicked', 'docgate_clicked',
    'recipient_corrected', 'expired', 'identity_verified', 'client_load_error'
  ));
