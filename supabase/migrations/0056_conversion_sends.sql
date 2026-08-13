-- Visibility for the server-side Conversions API sends (2026-08-13, direct
-- ask: "add CAPI send failures to the daily admin digest... it'd catch both
-- the token lapse and any schema drift, instead of you finding out weeks
-- later from a suspiciously flat conversion count").
--
-- Why this is needed: sendSignupConversions (src/lib/conversion-api.ts) is
-- deliberately best-effort and fire-and-forget -- a conversion send must
-- never be able to break a signup. The cost of that design is that every
-- failure mode is silent:
--   * LinkedIn's 3-legged OAuth token expires (~60 days) and every send
--     starts 401ing, with nothing but a console.error in a Vercel log
--     nobody reads.
--   * Either platform can change its payload schema and start 400ing.
--   * A missing/unset env var makes the function return before it even
--     tries, which looks identical to "no signups had a click ID".
--
-- That last case is why this logs SKIPPED and OK rows too, not just
-- failures. A digest line reading "0 attempted" is a completely different
-- problem from "12 attempted, 12 failed", and the whole point of this table
-- is being able to tell those apart at a glance.
--
-- Same pattern as plan_cap_hits/disposable_email_blocks/pending_attribution:
-- RLS on, no policies. Only the service-role admin client writes (from the
-- conversion-api send path) and reads (the daily admin-digest cron).
create table if not exists public.conversion_sends (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('reddit', 'linkedin')),
  -- 'ok'      -- platform accepted the event (2xx)
  -- 'failed'  -- platform rejected it (non-2xx); status_code + error say why
  -- 'error'   -- the fetch itself threw (network/DNS/timeout), no status code
  -- 'skipped' -- env vars not configured, so no attempt was made at all
  outcome text not null check (outcome in ('ok', 'failed', 'error', 'skipped')),
  org_id uuid references organizations (id) on delete set null,
  status_code integer,
  -- Truncated at the call site. Platform error bodies only -- never the
  -- click ID or access token, both of which are credentials/identifiers we
  -- have no reason to persist here.
  error text,
  created_at timestamptz not null default now()
);

alter table public.conversion_sends enable row level security;

create index if not exists conversion_sends_created_at_idx on public.conversion_sends (created_at);
