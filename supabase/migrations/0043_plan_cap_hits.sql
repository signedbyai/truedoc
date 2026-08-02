-- Tracking for the Free plan's 3-doc/month cap (CONSOLE_FREE_TIER_SCOPE.md
-- follow-up, 2026-08-03 direct ask: "monitor how many users hit the 3-doc
-- limit or attempt a 4th API call"). checkFreePlanDocCap() (src/lib/plan.ts)
-- is the single choke point every document-creating route already calls
-- before insert -- dashboard upload, upload-url, draft finalize, quote
-- finalize, duplicate, and the REST API v1 documents route. This table logs
-- one row every time that check actually blocks a request (not every check
-- -- only the ones that return the 402), so "how many times did someone hit
-- the wall" is a real count, not re-derived from the 3-doc snapshot alone.
--
-- Same pattern as feedback.sql: RLS on, no policies. Nothing in the browser
-- reads or writes this -- checkFreePlanDocCap always logs via the
-- service-role admin client regardless of which client it was called with,
-- and the only reader is the daily admin-digest cron (also service-role).
create table if not exists public.plan_cap_hits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  -- Which route/flow hit the cap, e.g. "dashboard_upload", "api_v1_documents",
  -- "draft_finalize", "quote_finalize", "duplicate". Free text, not an enum --
  -- new call sites shouldn't need a migration just to add a label.
  source text not null,
  created_at timestamptz not null default now()
);

alter table public.plan_cap_hits enable row level security;

create index if not exists plan_cap_hits_created_at_idx on public.plan_cap_hits (created_at);
create index if not exists plan_cap_hits_org_id_idx on public.plan_cap_hits (org_id);
