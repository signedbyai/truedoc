-- Free-tier seal-credit referrals (REFERRAL_SCOPE.md), layered on top of the
-- existing "give a month, get a month" program (0023_referrals.sql), not
-- replacing it. Reuses the same one-row-per-referred-org `referrals` table.
--
-- Deliberately does NOT add any new lifecycle to `status`/`qualified_at`/
-- `rewarded_at` -- those three columns stay fully owned by the existing
-- payment-triggered path (rewardReferrerOnFirstPayment,
-- webhooks/stripe/route.ts), untouched. That's a deliberate correction to
-- this scope doc's own implementation note (which assumed status =
-- 'rewarded' would also cover the new program): if the new seal-credit
-- trigger moved status to 'rewarded', the existing webhook's `referral.status
-- !== "pending"` guard would silently block the old free-month reward from
-- ever firing later for the same referred org -- directly breaking the
-- "layer on top, don't replace; background eligibility stays" decision
-- (REFERRAL_SCOPE.md, "Decided 2026-08-03" #1). Keeping the two programs on
-- separate columns (reward_type/credits_granted here vs. status/
-- qualified_at/rewarded_at) means both can independently fire on the same
-- row -- a referred org that seals a badge *and* later actually subscribes
-- triggers both rewards, as intended.
alter table public.referrals add column if not exists reward_type text
  check (reward_type in ('pro_month', 'seal_credits'));
alter table public.referrals add column if not exists credits_granted integer;
alter table public.referrals add column if not exists referred_credits_granted integer;

-- Backfill: every already-rewarded row got there via the only program that
-- existed before this migration.
update public.referrals set reward_type = 'pro_month' where status = 'rewarded' and reward_type is null;
