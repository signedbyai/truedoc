-- Sender referral loop: "give a month, get a month" (V3 #9).
-- The referrer and the newly-referred customer each get one free month of
-- Starter. The referrer's reward only unlocks once the referred org makes its
-- first REAL (non-zero) payment — the abuse guard, so throwaway signups can't
-- farm free months. See src/lib/referral.ts + the Stripe webhook.

-- Each org gets a stable share code (assigned lazily the first time they open
-- the referral card), and remembers who referred it.
alter table organizations add column if not exists referral_code text unique;
alter table organizations add column if not exists referred_by_org_id uuid references organizations (id);
-- Set when a referrer earns a reward while on the free plan (no subscription to
-- discount yet) — redeemed as the coupon on their next checkout.
alter table organizations add column if not exists pending_referral_reward boolean not null default false;

-- One row per referred org (unique) tracking the reward lifecycle.
--   pending   — referred org signed up via a code, hasn't paid yet
--   qualified — referred org made its first real payment (reward owed)
--   rewarded  — referrer has been credited
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_org_id uuid not null references organizations (id) on delete cascade,
  referred_org_id uuid not null references organizations (id) on delete cascade unique,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'rewarded')),
  referred_discount_applied boolean not null default false,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at timestamptz
);

create index if not exists referrals_referrer_idx on referrals (referrer_org_id);

alter table referrals enable row level security;

-- A referrer can see the referrals they generated (to power the dashboard
-- card's count). Writes happen only through the service-role admin client
-- (capture route + webhook), so no insert/update policy is needed.
drop policy if exists referrals_select_own on referrals;
create policy referrals_select_own on referrals
  for select using (
    referrer_org_id in (select org_id from organization_members where user_id = auth.uid())
  );
