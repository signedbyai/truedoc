-- Sender-editable subject line and personal message for the sign-request
-- invite email, from the field editor's "Customize invite email" modal
-- (same UI/send flow as recipient_notice, migration 0027).
--
-- Both are plain nullable text -- unlike recipient_notice there's no
-- meaningful "explicitly off" state here, so null/blank just means "use the
-- standard subject/no personal message." invite_subject replaces the
-- default subject line entirely when set; invite_message renders as an
-- extra paragraph in the email body when set.
--
-- Reused for resends after a recipient correction (signers/[signerId]
-- PATCH) and sequential next-signer invites (sign/[token]/submit), same as
-- recipient_notice, so every recipient on a document sees the same
-- customization, not just the first.
alter table documents add column if not exists invite_subject text;
alter table documents add column if not exists invite_message text;
