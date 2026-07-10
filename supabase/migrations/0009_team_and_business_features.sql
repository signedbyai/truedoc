-- Team & Business tier features: member invites, branding, API access.
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

-- ============================================================
-- ORGANIZATIONS: branding + API access columns
-- ============================================================
alter table organizations add column if not exists logo_url text;
alter table organizations add column if not exists brand_color text;
-- API key is stored hashed (sha256 hex) — never store the raw key. The
-- prefix (e.g. "sb_live_ab12") is kept in the clear so the UI can show a
-- masked reference without re-displaying the full secret.
alter table organizations add column if not exists api_key_hash text;
alter table organizations add column if not exists api_key_prefix text;

-- ============================================================
-- ORG INVITES (Team+ member invites)
-- ============================================================
create table if not exists org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token uuid not null default gen_random_uuid(),
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);

create index if not exists org_invites_token_idx on org_invites (token);
create index if not exists org_invites_org_id_idx on org_invites (org_id);

alter table org_invites enable row level security;

-- ============================================================
-- HELPER: is_org_admin — owner or admin role (mirrors is_org_member from
-- 0004_fix_org_members_rls_recursion.sql, same recursion-avoidance pattern).
-- ============================================================
create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where org_id = target_org_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- Org admins/owners can manage invites for their org.
create policy "org admins can manage invites" on org_invites
  for all using (is_org_admin(org_id));

-- Organization_members: allow admins/owners to remove members (but not the
-- owner row — enforced in the API route, since RLS can't easily reference
-- the target row's own role vs. requester's role without recursion).
create policy "org admins can remove members" on organization_members
  for delete using (is_org_admin(org_id));

-- Organizations: allow admins (not just the owner) to update branding —
-- widens the existing owner-only update policy from 0001_init.sql.
create policy "org admins can update org" on organizations
  for update using (is_org_admin(id));
