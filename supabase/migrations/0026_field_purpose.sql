-- What a text field is "for" — set by AI field suggestion (a printed name,
-- job title, or company). Drives sign-time pre-fill: a "name" text field
-- defaults to the signer's name. Nullable; unset means a plain text field.
-- (Date auto-fill needs no column — it's keyed off the field type.)
alter table public.document_fields add column if not exists purpose text;
