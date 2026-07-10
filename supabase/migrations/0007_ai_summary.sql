-- "What am I signing?" AI summary feature. The summary is generated once
-- per document (the source PDF never changes after upload) and cached here
-- so repeat views by the same or different signers don't re-call the
-- Anthropic API — keeps cost bounded to one generation per document.

alter table documents add column if not exists ai_summary text;
alter table documents add column if not exists ai_summary_generated_at timestamptz;
