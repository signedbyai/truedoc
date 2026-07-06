-- SignedBy — initial schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'starter', 'team', 'business')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled document',
  status text not null default 'draft' check (status in ('draft', 'sent', 'completed', 'declined', 'voided')),
  file_path text not null,          -- Cloudflare R2 object key for the source PDF
  signed_file_path text,            -- R2 object key for the final signed PDF + certificate
  original_filename text not null,
  page_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  base_file_path text not null,     -- R2 key of the blank template PDF
  field_map jsonb not null default '[]'::jsonb, -- saved field positions/types to re-apply
  created_at timestamptz not null default now()
);

-- ============================================================
-- SIGNERS
-- ============================================================
create table if not exists signers (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  email text not null,
  name text,
  order_index int not null default 0,       -- sequential routing order; same value = parallel
  status text not null default 'pending' check (status in ('pending', 'sent', 'viewed', 'signed', 'declined')),
  signing_token uuid not null default gen_random_uuid(), -- unguessable token for the no-login signing link
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists signers_signing_token_idx on signers (signing_token);

-- ============================================================
-- DOCUMENT FIELDS
-- ============================================================
create table if not exists document_fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  signer_id uuid references signers (id) on delete cascade,
  type text not null check (type in ('signature', 'initials', 'date', 'text', 'checkbox')),
  page int not null default 1,
  x numeric not null,       -- 0-1 normalized position on the page
  y numeric not null,
  width numeric not null,
  height numeric not null,
  value text,               -- filled-in value once signed
  required boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT TRAIL (ESIGN / UETA evidence)
-- ============================================================
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  signer_id uuid references signers (id) on delete set null,
  event_type text not null check (
    event_type in ('created', 'sent', 'viewed', 'consent_given', 'signed', 'declined', 'completed', 'voided')
  ),
  ip_address text,
  user_agent text,
  document_hash text,        -- sha256 of the document at this event, for tamper evidence
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SUBSCRIPTIONS (Stripe)
-- ============================================================
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'team', 'business')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WAITLIST (public landing page capture — no auth required)
-- ============================================================
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table documents enable row level security;
alter table templates enable row level security;
alter table signers enable row level security;
alter table document_fields enable row level security;
alter table audit_events enable row level security;
alter table subscriptions enable row level security;
alter table waitlist enable row level security;

-- Organizations: members can read; only the owner can update/delete
create policy "org members can view their org" on organizations
  for select using (
    exists (select 1 from organization_members m where m.org_id = organizations.id and m.user_id = auth.uid())
  );
create policy "owner can update org" on organizations
  for update using (owner_id = auth.uid());
create policy "authenticated users can create an org" on organizations
  for insert with check (owner_id = auth.uid());

-- Organization members: members can view their own membership rows
create policy "members can view own org roster" on organization_members
  for select using (
    exists (select 1 from organization_members m where m.org_id = organization_members.org_id and m.user_id = auth.uid())
  );

-- Documents: scoped to org membership
create policy "org members can view documents" on documents
  for select using (
    exists (select 1 from organization_members m where m.org_id = documents.org_id and m.user_id = auth.uid())
  );
create policy "org members can insert documents" on documents
  for insert with check (
    exists (select 1 from organization_members m where m.org_id = documents.org_id and m.user_id = auth.uid())
  );
create policy "org members can update documents" on documents
  for update using (
    exists (select 1 from organization_members m where m.org_id = documents.org_id and m.user_id = auth.uid())
  );

-- Templates: same org-scoped pattern
create policy "org members can manage templates" on templates
  for all using (
    exists (select 1 from organization_members m where m.org_id = templates.org_id and m.user_id = auth.uid())
  );

-- Signers / fields / audit events: scoped via parent document's org
create policy "org members can view signers" on signers
  for select using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = signers.document_id and m.user_id = auth.uid()
    )
  );

create policy "org members can view fields" on document_fields
  for select using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = document_fields.document_id and m.user_id = auth.uid()
    )
  );

create policy "org members can view audit events" on audit_events
  for select using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = audit_events.document_id and m.user_id = auth.uid()
    )
  );

-- Subscriptions: org members can view, only owner-driven server routes write (service role bypasses RLS)
create policy "org members can view subscription" on subscriptions
  for select using (
    exists (select 1 from organization_members m where m.org_id = subscriptions.org_id and m.user_id = auth.uid())
  );

-- Waitlist: anyone can insert their email, nobody can read the list back via the public API
create policy "anyone can join waitlist" on waitlist
  for insert with check (true);

-- NOTE: Signer-facing signing pages are unauthenticated (no Supabase session — the
-- signer only has a `signing_token` link). Those flows must go through server-side
-- API routes using the SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS), never the
-- public anon key. See src/lib/supabase/admin.ts.
