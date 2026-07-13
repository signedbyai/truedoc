-- Adds DeepSeek as a third selectable value for organizations.ai_provider
-- (alongside anthropic and mistral, added in 0015). DeepSeek is reached
-- through its Anthropic-compatible API endpoint
-- (https://api.deepseek.com/anthropic), so the app uses the same
-- @anthropic-ai/sdk client as real Anthropic calls, just pointed at a
-- different base URL and a separate server-side key (DEEPSEEK_API_KEY env
-- var) — not a per-org bring-your-own-key setup, same pattern as Mistral.
-- See src/lib/ai-provider.ts.
--
-- Widening an existing CHECK constraint isn't idempotent the same way
-- ADD COLUMN IF NOT EXISTS is, so this drops the constraint 0015 created
-- (under Postgres's default auto-generated name for an unnamed column
-- check: "<table>_<column>_check") and re-adds it with the wider list.
-- Safe to re-run: DROP ... IF EXISTS no-ops on a second run, and the
-- ADD CONSTRAINT is a plain redefinition each time.
alter table organizations drop constraint if exists organizations_ai_provider_check;
alter table organizations add constraint organizations_ai_provider_check
  check (ai_provider in ('anthropic', 'mistral', 'deepseek'));
