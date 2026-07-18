-- In-app "Send us feedback" messages (the nav message-bubble icon). Primary
-- delivery is an email to the team via Resend; this table is the searchable
-- record. Access is service-role only: the /api/feedback route writes with the
-- admin client, and nothing reads it from the browser — so RLS is on with no
-- policies (which denies all anon/authenticated access; the service role
-- bypasses RLS).
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid,
  email text,
  message text not null,
  page text,
  plan text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
