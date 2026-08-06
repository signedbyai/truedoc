-- Tracking for disposable-email signup blocks (2026-08-05 direct ask, "show
-- me how many logins blocked as disposable emails" in the daily digest).
-- isDisposableEmailAddress() (src/lib/disposable-email.ts) is checked in
-- sendMagicLink (src/app/login/actions.ts) before an OTP is ever sent --
-- until now that rejection only ever produced a console.log line, so there
-- was no way to see it outside a Vercel function log. This table gives it
-- the same persistence plan_cap_hits already has for the 3-doc cap.
--
-- Same pattern as plan_cap_hits/feedback: RLS on, no policies. Nothing in
-- the browser reads or writes this -- sendMagicLink always logs via the
-- service-role admin client, and the only reader is the daily admin-digest
-- cron (also service-role).
create table if not exists public.disposable_email_blocks (
  id uuid primary key default gen_random_uuid(),
  -- Domain only, not the full address -- matches the console.log this
  -- replaces/augments: enough to spot which disposable providers show up
  -- and how often, without persisting a PII-bearing local part for an
  -- address that never became an account.
  domain text not null,
  ip text,
  created_at timestamptz not null default now()
);

alter table public.disposable_email_blocks enable row level security;

create index if not exists disposable_email_blocks_created_at_idx on public.disposable_email_blocks (created_at);

	