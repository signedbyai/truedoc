-- Lets a sender fix a signer's email/name after a document has already been
-- sent, without voiding the whole document (which would lose any signatures
-- already collected from other signers in a sequential flow). See
-- src/app/api/documents/[id]/signers/[signerId]/route.ts (PATCH).
--
-- No RLS change needed — "org members can update signers" (0005) already
-- covers this; only the check constraint below needs widening so the new
-- audit event type is accepted.

alter table audit_events drop constraint if exists audit_events_event_type_check;
alter table audit_events add constraint audit_events_event_type_check
  check (event_type in (
    'created', 'sent', 'viewed', 'consent_given', 'signed', 'declined',
    'completed', 'voided', 'payment_link_clicked', 'recipient_corrected'
  ));
