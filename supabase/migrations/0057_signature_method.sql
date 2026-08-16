-- Records HOW a signature/initials mark was produced: typed into the pad and
-- rendered in a script font, or drawn by hand.
--
-- SIGNATURE_FIELD_VALIDATION_SCOPE.md layer 3. Until now only the rendered PNG
-- data URL was stored, so a typed name and a hand-drawn mark were
-- indistinguishable at the storage layer — which meant the certificate of
-- completion could not report which was used, and the four signing options the
-- signing view offers (draw / type / date / initials) carried no distinct
-- evidentiary meaning. Raised by the first external tester as "what's the point
-- of all the different signing options?".
--
-- NULL is expected and permanent for every field signed before this shipped:
-- the information was never captured, so it cannot be back-filled. Certificate
-- rendering treats NULL as "say nothing" rather than guessing.
--
-- Only ever set for type IN ('signature','initials') — the submit route gates
-- on the field's real type rather than trusting the client's payload.

alter table document_fields
  add column if not exists signature_method text;

alter table document_fields
  drop constraint if exists document_fields_signature_method_check;

alter table document_fields
  add constraint document_fields_signature_method_check
  check (signature_method is null or signature_method in ('typed', 'drawn'));

comment on column document_fields.signature_method is
  'How a signature/initials mark was produced: typed or drawn. NULL for non-signature fields and for anything signed before 2026-08-16 (never captured, not back-fillable). A factual record of METHOD only - it asserts nothing about identity or legal weight.';
