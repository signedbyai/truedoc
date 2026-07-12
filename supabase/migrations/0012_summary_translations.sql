-- Per-language cache for the "what am I signing?" summary translation
-- feature. The English summary (documents.ai_summary) is generated once
-- from the document text as before; translations are derived from that
-- cached English summary (not re-summarized from the raw PDF text) and
-- cached here per language code, so repeat views in the same language by
-- the same or different signers never re-call the Anthropic API.

alter table documents add column if not exists ai_summary_translations jsonb not null default '{}'::jsonb;
