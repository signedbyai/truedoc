-- Templates: track page count so a document created from a template can
-- render correctly without re-inspecting the PDF.
alter table templates add column if not exists page_count int not null default 1;

-- document_fields.template_role: a 0-based "recipient slot" number, set only
-- on fields seeded from a template before real recipients exist yet
-- (signer_id is null at that point). FieldEditor auto-binds these to real
-- signer_id values as recipients are added, in order. Irrelevant once a
-- field has a real signer_id.
alter table document_fields add column if not exists template_role int;

-- Reminders: sent_at marks when a signer was actually emailed (distinct from
-- created_at, which is when the row was created at document-creation time —
-- for later routing tiers those can be days apart). last_reminder_at tracks
-- the most recent reminder nudge so the cron job doesn't re-notify more than
-- once per cadence window.
alter table signers add column if not exists sent_at timestamptz;
alter table signers add column if not exists last_reminder_at timestamptz;
