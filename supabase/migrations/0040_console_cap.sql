-- Console spend cap + reset bookkeeping (CONSOLE_UX_SCOPE.md). Adds the
-- columns needed for: (a) a per-org dollar cap on metered console usage,
-- on by default at $25/month; (b) a once-per-period 80%-of-cap warning
-- flag, so the warning email fires once, not on every request past 80%;
-- (c) a once-ever "seen the cap explainer popover" flag, unrelated to
-- billing periods.
--
-- Note: console_usage_current_period (migration 0039) has never had reset
-- logic — it only ever incremented. This migration doesn't add the reset
-- column (there's nothing to add, the counter already exists), but the
-- webhook change that ships alongside this migration (invoice.payment_succeeded
-- in src/app/api/webhooks/stripe/route.ts) is what actually resets it each
-- billing period, together with console_cap_warning_sent_at below.

alter table organizations
  add column if not exists console_spend_cap_cents integer not null default 2500,
  add column if not exists console_spend_cap_enabled boolean not null default true,
  add column if not exists console_cap_warning_sent_at timestamptz,
  add column if not exists console_cap_intro_seen_at timestamptz;

comment on column organizations.console_spend_cap_cents is
  'Dollar cap (in cents) on metered console overage spend per billing period. Defaults to $25.00. Only enforced when console_spend_cap_enabled is true.';
comment on column organizations.console_spend_cap_enabled is
  'Whether the spend cap is active. Defaults to true (on) so every Pro/Team org starts protected; the org can raise, lower, or disable it from /dashboard/console.';
comment on column organizations.console_cap_warning_sent_at is
  'When the 80%-of-cap warning email last fired. Reset to null alongside console_usage_current_period each billing period (invoice.payment_succeeded), so the warning can fire again next period.';
comment on column organizations.console_cap_intro_seen_at is
  'When the org first dismissed the one-time "here''s what the spend cap is" popover on /dashboard/console. Never reset — this is a lifetime flag, not per-period.';
