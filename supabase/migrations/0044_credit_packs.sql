-- Pay-as-you-go credit packs (CONSOLE_FREE_TIER_SCOPE.md item #8, deferred
-- as "v2" 2026-08-02, built 2026-08-03 on direct instruction). Lets a Free
-- org top up past its 3-doc/month cap with a one-time purchase instead of
-- subscribing -- the India/recurring-card-friction reasoning from the
-- original request: prepaid over recurring, for people who'd rather not
-- put a card on a subscription.
--
-- doc_credits is a simple balance, spent one at a time by
-- checkFreePlanDocCap (src/lib/plan.ts) whenever the monthly 3-doc
-- allowance is already used up. It never resets on its own (unlike the
-- monthly cap, which is a rolling count of this month's documents) --
-- credits are a top-up, not a subscription period, so they carry over
-- until spent. Nullable-free (defaults to 0) so every existing org is
-- unaffected until they actually buy a pack.
alter table public.organizations add column if not exists doc_credits integer not null default 0;

-- Purchase ledger, doubling as the webhook's idempotency guard: Stripe can
-- (and does) redeliver the same checkout.session.completed event, and
-- without a unique constraint on the session id a retried delivery would
-- silently double-credit an org's balance. Same RLS shape as feedback.sql
-- and plan_cap_hits: nothing in the browser reads or writes this, only the
-- Stripe webhook (service-role) inserts, and the admin digest cron
-- (service-role) reads it for the "packs sold" stat.
create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  credits integer not null,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;

create index if not exists credit_purchases_org_id_idx on public.credit_purchases (org_id);
create index if not exists credit_purchases_created_at_idx on public.credit_purchases (created_at);
