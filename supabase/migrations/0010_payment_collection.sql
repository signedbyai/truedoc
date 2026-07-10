-- Payment collection (Business tier, external-link approach — see
-- src/app/api/documents/[id]/payment/route.ts for why this isn't Stripe
-- Connect). An org pastes a payment link they already own (e.g. a Stripe
-- Payment Link); the signing page shows a "Pay" button that opens it.
-- No money touches SignedBy and there's no completion tracking — just a
-- best-effort "payment_link_clicked" audit event.

alter table documents add column if not exists payment_link_url text;
alter table documents add column if not exists payment_label text;
alter table templates add column if not exists payment_link_url text;
alter table templates add column if not exists payment_label text;

alter table audit_events drop constraint if exists audit_events_event_type_check;
alter table audit_events add constraint audit_events_event_type_check
  check (event_type in (
    'created', 'sent', 'viewed', 'consent_given', 'signed', 'declined',
    'completed', 'voided', 'payment_link_clicked'
  ));
