-- Which AI provider powers this org's AI-assisted features: field
-- placement suggestions (src/lib/suggest-fields.ts), document drafting
-- (src/lib/draft-document.ts), and document summaries/translation
-- (src/lib/summarize-document.ts). Defaults to Mistral — Anthropic
-- remains available as an alternative for anyone who'd rather use it,
-- using a single server-side Mistral API key (MISTRAL_API_KEY env var),
-- not a per-org bring-your-own-key setup.
--
-- This is a plain org-level preference, not a plan-tier gate — same
-- pattern as auto_suggest_on_upload (0014) — available on every plan,
-- since the underlying features it controls are themselves ungated
-- (aside from document drafting, which stays gated to Starter+ regardless
-- of which provider generates it).
--
-- Toggled in dashboard/settings (src/app/api/org/ai-provider/route.ts).

-- Check constraint is inline with the column add (not a separate ADD
-- CONSTRAINT statement) so this whole thing stays a single idempotent
-- statement — Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS, but
-- ADD COLUMN IF NOT EXISTS skips the entire statement, constraint
-- included, on a re-run once the column already exists.
alter table organizations
  add column if not exists ai_provider text not null default 'mistral'
  check (ai_provider in ('anthropic', 'mistral'));
