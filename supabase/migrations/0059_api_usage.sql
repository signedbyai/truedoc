-- API usage visibility (API_USAGE_VISIBILITY_SCOPE.md, 2026-08-18 direct
-- ask: "is there a way to track API usage" / "can I even see what CRM is
-- calling the API?"). authenticateApiRequest() (src/lib/api-auth.ts) is the
-- single choke point every /api/v1/* route and /api/mcp go through -- it
-- logged nothing on a successful call before this. This table logs one row
-- per successful call, written right there, so every current and future
-- v1/mcp route is covered for free without instrumenting each one.
--
-- Same pattern as plan_cap_hits.sql and feedback.sql: RLS on, no policies.
-- Nothing in the browser reads or writes this -- the write always goes via
-- a fresh service-role admin client regardless of which client
-- authenticateApiRequest was otherwise using, and the only reader is the
-- daily admin-digest cron (also service-role).
create table if not exists public.api_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  -- "GET", "POST", etc.
  method text not null,
  -- pathname only, e.g. "/api/v1/documents", "/api/mcp" -- not the full URL,
  -- no query string.
  endpoint text not null,
  -- raw User-Agent header, nullable. This is the tool-identification
  -- signal -- Zapier/Make/Postman/curl/etc. mostly send identifiable UA
  -- strings; a native CRM's outbound-webhook action often doesn't announce
  -- itself, so this narrows the answer to "what's calling this," it
  -- doesn't guarantee an exact tool name every time.
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.api_usage enable row level security;

create index if not exists api_usage_created_at_idx on public.api_usage (created_at);
create index if not exists api_usage_org_id_idx on public.api_usage (org_id);
