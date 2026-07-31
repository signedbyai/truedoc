-- Console chat history (2026-07-31) — persisted conversations for the
-- console chat pane, so a user can browse and reopen past chats instead of
-- losing everything on refresh (previously in-memory only, plain useState
-- in console-chat.tsx). One row per conversation ("chat session"); the
-- whole message array is stored as JSONB rather than a separate messages
-- table — conversations here are short and bounded, and this matches the
-- existing convention elsewhere in this schema (e.g. templates.field_map)
-- of a JSON blob for a small, whole-object-read/write shape rather than a
-- join.
--
-- Scoped per-user, not per-org: a Team/Business org can have several
-- people with console access, and each person's chat history is personal
-- to them (like any other chat product), not a shared org-wide feed mixed
-- together — direct instruction, 2026-07-31 ("Saved chat history should
-- be per chat session"). org_id is kept alongside user_id for defense in
-- depth / a simpler org-scoped cleanup query if ever needed, matching how
-- console-actions.ts always double-checks org_id even on rows that are
-- also otherwise scoped.
create table if not exists console_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists console_conversations_user_id_updated_at_idx
  on console_conversations (user_id, updated_at desc);

comment on table console_conversations is
  'Persisted console chat conversations ("chat sessions"), one row per conversation. Scoped to the individual user, not shared org-wide.';
comment on column console_conversations.title is
  'Auto-derived from the first user message in the conversation (truncated). No editing UI built yet.';
comment on column console_conversations.messages is
  'The full message array for this conversation, in the same {role, content, confirm?} shape the client renders — not the raw Mistral wire format (system prompt, tool_calls, tool results are never persisted here).';

-- No RLS policies — same pattern as every other table this app's console
-- code touches (console-actions.ts etc.): API routes use the service-role
-- admin client and enforce org_id/user_id scoping in application code,
-- not Postgres policies.
