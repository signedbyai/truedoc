-- Saved recurring signers/recipients per org (Settings > Frequent signers).
-- Phase 1 of the backlog item (see product_backlog.md memory): an org-scoped
-- contact list consumed by an optional "who's this for?" picker on the AI
-- Drafter and Magic Quote drafting flows, pre-filling the first recipient
-- instead of retyping the same counterparty's email every time. Phase 2
-- (not built here) wires this into the existing "detected parties" scan in
-- field-editor.tsx (name-match auto-fill).
create table if not exists public.frequent_signers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null,
  -- True only for the one row auto-seeded from the creating user's own
  -- account (the cold-start fix -- a brand-new list is never empty, and it
  -- covers the real case of a sender who's a party to their own documents).
  -- Distinguished in the UI ("(you)", not removable the same way as a
  -- sender-added contact).
  is_self boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists frequent_signers_org_id_idx on public.frequent_signers(org_id);

alter table public.frequent_signers enable row level security;

-- Same org-scoped manage-everything pattern as templates (0001_init.sql).
create policy "org members can manage frequent signers" on public.frequent_signers
  for all using (
    exists (select 1 from organization_members m where m.org_id = frequent_signers.org_id and m.user_id = auth.uid())
  );
