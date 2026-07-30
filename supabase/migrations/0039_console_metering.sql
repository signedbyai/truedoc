-- Console AI signing-ops product (CONSOLE_AI_SIGNING_SCOPE.md): metered API
-- access for Pro/Team orgs, on top of the existing Business-tier unlimited
-- included access. This migration adds the tracking columns only — the
-- actual Stripe usage-record reporting is intentionally NOT wired up yet
-- (see src/lib/console-usage.ts's comment on why: it needs a short live
-- verification pass against Stripe test mode, specifically around which
-- currency the metered subscription item should be created in, before any
-- real usage-record API call gets written). This counter is a good-enough
-- v1 usage display; Stripe's own invoice remains the source of truth for
-- actual billing once that half is wired up.

alter table organizations
  add column if not exists console_usage_current_period integer not null default 0,
  add column if not exists console_first_used_at timestamptz,
  add column if not exists console_subscription_item_id text;

comment on column organizations.console_usage_current_period is
  'Metered console document-sends this billing period. Reset by a future cron once Stripe usage-record reporting lands; until then this is a simple running count for the dashboard, not a billing source of truth.';
comment on column organizations.console_subscription_item_id is
  'Stripe subscription item id for the metered console price, once attached. Null until the org''s first metered send.';
