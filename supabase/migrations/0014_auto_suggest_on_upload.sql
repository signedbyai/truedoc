-- Whether AI field-placement suggestions (src/lib/suggest-fields.ts) run
-- automatically the moment a brand-new document is opened in the field
-- editor, versus only when the sender explicitly presses "Suggest fields"
-- themselves. Defaults to false — auto-run used to be the only behavior,
-- but going straight into AI-suggested-field mode before a sender has even
-- looked at the document made some senders uncomfortable. The manual
-- "Suggest fields" button remains available regardless of this setting;
-- this only controls whether that scan also fires on its own on upload.
-- Toggled in dashboard/settings (src/app/api/org/auto-suggest/route.ts).

alter table organizations add column if not exists auto_suggest_on_upload boolean not null default false;
