-- Outbound webhooks -- multi-destination per org (CRM_MCP_READINESS_PHASE1_SCOPE.md,
-- project root, Part B). Many rows per org, not one: each endpoint gets its
-- own secret so a single leaked/retired destination (e.g. an old Make
-- scenario nobody uses anymore) doesn't require rotating every other
-- destination's secret too -- same reasoning Stripe uses for per-endpoint
-- webhook signing secrets, not one per account.
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  -- Nullable, purely cosmetic -- lets a Settings list of several endpoints
  -- read as "Make: deal sync" / "Internal audit log" instead of a wall of
  -- bare URLs.
  label text,
  url text not null,
  -- Unlike the API key (hashed -- we're the ones verifying it), a webhook
  -- secret is verified by the ORG's own receiving system, so it has to stay
  -- readable indefinitely for them to (re)configure Make/etc -- same as how
  -- Stripe's dashboard always shows a webhook's signing secret rather than a
  -- one-time reveal. Not a materially bigger exposure than the url column
  -- itself, which the org chose to give us.
  secret text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists webhook_endpoints_org_id_idx on public.webhook_endpoints(org_id);

alter table public.webhook_endpoints enable row level security;

-- Same org-scoped manage-everything pattern as frequent_signers (0032).
create policy "org members can manage webhook endpoints" on public.webhook_endpoints
  for all using (
    exists (select 1 from organization_members m where m.org_id = webhook_endpoints.org_id and m.user_id = auth.uid())
  );
