-- Per-document mute for "signer just opened" sender emails (V3 #8).
-- Defaults ON: the notification is the feature; the column exists so a
-- sender can silence a specific document (e.g. a bulk send where dozens of
-- first-opens would drown their inbox) without a global setting.
alter table documents add column if not exists open_notifications boolean not null default true;




