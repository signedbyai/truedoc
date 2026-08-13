-- Server-side hand-off for first-touch signup attribution across a browser
-- change (2026-08-13, found while diagnosing why 39 of 46 signups in 30 days
-- recorded signup_utm_source = null despite every active Reddit ad carrying
-- ?utm_source=reddit on its destination URL).
--
-- Root cause: attribution-capture.tsx stashes the UTMs in localStorage and
-- attribution-claim.tsx reads them back after signup, which only works when
-- the landing and the signup happen in the SAME browser. The real mobile
-- path doesn't: a Reddit ad opens in Reddit's in-app webview, the person
-- enters their email, the magic link arrives in their mail app, and that
-- link opens in Safari/Chrome -- a different storage context with an empty
-- localStorage. 92% of site traffic is mobile and only ~7% is desktop,
-- which matches the 2-of-46 (4%) attribution survival rate almost exactly.
-- (The 6-digit-code path on /login stays in one browser and was never
-- affected -- this is specifically the magic-link hop.)
--
-- Fix: sendMagicLink stashes whatever attribution the browser had at the
-- moment the email was submitted, keyed by a hash of that email, and the
-- first successful login for that address claims it onto the org. Survives
-- any number of browser/device hops because nothing client-side has to
-- persist.
--
-- email_hash, never the address itself: this table necessarily holds rows
-- for people who asked for a magic link and never completed signup, i.e.
-- addresses that never became accounts. Storing a sha256 of the normalized
-- address keeps this out of PII territory entirely (same reasoning as
-- disposable_email_blocks storing the domain only, and as
-- agent_action_events hashing args in AI_AGENT_ACTION_TIMESTAMPING_SCOPE.md)
-- while still allowing an exact-match lookup at claim time, since the claim
-- side knows the real address and can re-derive the same hash.
--
-- Same pattern as plan_cap_hits/disposable_email_blocks: RLS on, no
-- policies. Nothing in the browser touches this -- both the write
-- (sendMagicLink) and the read/delete (claimPendingAttribution) go through
-- the service-role admin client.
create table if not exists public.pending_attribution (
  -- sha256 of the lowercased, trimmed email address. Primary key so a
  -- repeated magic-link request for the same address overwrites rather than
  -- accumulating rows -- last touch before signup wins, which matches the
  -- intent better than keeping a stale first attempt.
  email_hash text primary key,
  -- The same shape attribution-claim.tsx POSTs to /api/attribution/capture:
  -- utm_source/medium/campaign/content/term, referrer, landing_path, and the
  -- rdt_cid/li_fat_id click IDs from 0051_signup_click_ids.sql. Kept as
  -- jsonb rather than mirroring the organizations.signup_* columns so this
  -- staging table doesn't need a migration every time that set changes.
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.pending_attribution enable row level security;

-- Supports the retention sweep below; rows are pure waste once claimed or
-- expired, and unclaimed ones would otherwise accumulate forever.
create index if not exists pending_attribution_created_at_idx on public.pending_attribution (created_at);
