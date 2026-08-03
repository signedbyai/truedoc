# Scope: Tiered seal-credit referrals for Free console, Pro+ unchanged

Status: SCOPED 2026-08-03, **BUILT 2026-08-04** (migration + deploy owed).
Direct request: a referral program for Free-tier console, gift-box style
like the dashboard's existing referral card, rewarding **seal credits**
instead of a month-off, tiered so 3+ successful referrals unlocks a
**"Super Referrer"** boost. Pro+ keeps "give a month, get a month." All
four open questions below are resolved — layer-on-top (not replace), 5/10
credits at a 3-referral threshold, reward the referred side too (3
credits), and the plan-change edge case resolved via reward-time plan
checking (Option A).

**Build note — a real conflict caught between two parts of this same doc,
resolved in the code, not as originally drafted.** The "Data model"
section below reuses `referrals.status` implicitly, and the "Super
Referrer" implementation note explicitly says to compute it via `status =
'rewarded' and reward_type = 'seal_credits'` — which would require the new
seal-credit trigger to move `status` to `'rewarded'`. But
`rewardReferrerOnFirstPayment` (the *existing*, unmodified webhook path)
already guards on `referral.status !== "pending"` and bails — so moving
`status` at seal time would silently break the "layer on top, don't
replace; background eligibility stays" decision (#1 below) the moment a
referred org sealed a badge before ever subscribing. Built it so `status`/
`qualified_at`/`rewarded_at` stay 100% owned by the old payment path,
untouched; the new program only ever writes `reward_type`/
`credits_granted`/`referred_credits_granted`, and Super Referrer counting
uses `reward_type = 'seal_credits' and credits_granted > 0` instead of
`status`. Both programs can now independently fire on the same referral
row, which is what was actually decided. See migration
`0046_referral_seal_credits.sql`'s comment and `referral.ts`'s
`grantSealCreditReferralReward` for the full reasoning.

One more judgment call not explicitly in this doc: the referred org's
welcome credit (3 credits) is gated on the *referred* org still being on
the free plan at grant time too, mirroring Option A's own "don't mint dead
`doc_credits`" reasoning applied symmetrically.

## Correcting a framing assumption before scoping the rest

The request frames this as "Free gets something new, Pro+ keeps what it has
unchanged" — as if Free doesn't currently have a referral program at all.
That's not quite right, and it changes the design:

**The existing "give a month, get a month" program (`referral-card.tsx`,
`referral-gift-button.tsx`, `0023_referrals.sql`) has zero plan-gating
today.** Every org, Free included, gets a referral link, sees the gift-box
card, and is eligible for the reward. The reward itself is keyed off the
**referred org's first real Stripe payment** (`invoice.payment_succeeded`,
`amount_paid > 0`) — so a Free referrer whose friend never subscribes never
gets rewarded today, but a Free referrer whose friend *does* subscribe
absolutely does (`organizations.pending_referral_reward`, redeemed at the
referrer's own next checkout). This is a real, valuable, working mechanism:
it's what rewards a free-tier evangelist for converting someone into a
paying customer, and it costs nothing extra to keep running.

**Recommendation: don't remove that path for Free orgs — layer the new
seal-credits program on top of it, not instead of it.** Free orgs get:
- The new, *lower-bar* seal-credits reward, triggered by the referred org's
  first sealed Verified Badge document (no payment required) — this is the
  thing that's actually new, and it's what gets surfaced as Free's gift-box
  pitch.
- The existing, *higher-bar* free-month reward stays eligible in the
  background if their referred friend later actually subscribes — not the
  headline pitch on Free's card, but not thrown away either.

Pro+ orgs keep exactly what they have today, headline and all — no changes
to their gift-box card, copy, or mechanism.

The alternative — fully carving Free out of the existing coupon loop and
replacing it — is simpler to reason about but strictly worse: it deletes a
working mechanism that currently earns SignedBy free-to-paid conversions for
no reason other than tidiness. Flagging this as the one open question in
this doc genuinely worth confirming before building (see below), since it's
a real design fork, not just an implementation detail.

## Recommended numbers

Grounding: a seal credit currently retails at **$0.20** (the $5/25 credit
pack, `CREDIT_PACK_PRICE_USD_CENTS` / `CREDIT_PACK_CREDITS`, deliberately
matched to Console's $0.20/doc overage rate the same day it shipped — see
`console-overage-price-gap` memory). The existing Pro+ reward is worth
**$7** retail (one month of Pro, `currency.ts`'s `starter: 7`). Free's
reward should read as generous relative to their own 3-doc/month baseline
without approaching real money — this is a teaser mechanic, not a discount.

| | Credits per referral | Retail value | Trigger |
|---|---|---|---|
| **Standard** | **5 credits** | $1.00 | Referred org's first identity-verified Verified Badge seal |
| **Super Referrer** (3+ rewarded referrals) | **10 credits** (2x) | $2.00 | Same trigger, once unlocked |

Why these numbers:
- **5 credits** is more than a full extra month's worth of Free's own 3-doc
  cap (5 > 3) — meaningfully better than just waiting for the calendar to
  reset, which is the bar a referral reward needs to clear to be worth
  sharing a link over. It's also a fifth of a full credit pack (25 credits/
  $5), a legible "1/5 of what you'd pay for" mental model.
- **A clean 2x for Super Referrer** (not 3x or a flat +5) — easy to state in
  one line of UI copy ("Refer 3+ friends and double your reward"), and
  doubling reads as a real status jump without needing to touch the base
  economics if it's tuned later.
- **3 successful (rewarded) referrals** to unlock Super Referrer status,
  matching the number in the original request. Not retroactive — the boost
  applies to the 4th referral onward, not backfilled onto the first 3, same
  "changes apply going forward" convention as the 2026-08-03 price
  step-down elsewhere in this codebase.
- Both numbers are a same-order-of-magnitude fraction of the $7 Pro+
  reward ($1–$2 vs. $7), intentionally smaller — Free referrers are a
  lower-LTV audience and this is meant to nudge sharing, not fund it.

These are a starting recommendation, not something I'd treat as locked —
cheap to tune later since they're a plain constant, not a Stripe Price
object (no re-issuing problem like the metered-price step-down had).

## Qualifying trigger, and why it doubles as the anti-abuse gate

**Trigger: the referred org's first identity-verified Verified Badge
seal** — not signup, not email verification alone. Two reasons this is the
right bar, not an arbitrary one:

1. **It's the only thing a Free org can actually do on Console today.**
   `CONSOLE_FREE_TIER_SCOPE.md`'s real constraint: `templates` stays
   Pro+-only, so Verified Badge sealing is Free console's entire value
   proposition. Keying the reward to it means the referral program is
   pointing at the exact thing Free orgs are there to try.
2. **It's a real anti-abuse gate, same shape as "first real payment" on
   the existing loop.** Sealing a Verified Badge document requires passing
   Stripe Identity's government-ID check first (`getOrgIdentityStatus`,
   `identity.ts`) — spinning up fake referred orgs to farm credits means
   passing a real ID check per fake org, not just registering a disposable
   email (already blocked separately, see `disposable-email-blocklist`
   memory). Not a perfect gate, but a meaningfully expensive one to fake at
   scale, mirroring the reasoning that already justified "first real
   payment" as the existing program's own abuse guard.

Not proposing a hard cap on total credits earnable — the identity-check
cost per qualifying referral already bounds abuse better than an arbitrary
number would, and `doc_credits` is already a plain running balance (no
"one pending reward at a time" ceiling like the existing coupon program
needs, since credits stack cleanly instead of representing a single
discount slot).

## Open decision: reward the referred side too?

The existing program is explicitly mutual — "give a month, get a month,"
both sides benefit. This request only specifies the referrer's reward.
**Recommended: yes, give the referred org a smaller welcome credit (e.g. 3
credits) on their own first seal**, triggered by the same event — keeps the
"give X, get X" spirit the brand already uses, and it's the same one
qualifying action, just crediting two orgs instead of one. Not required —
flagging as a real decision, not assuming it.

## Data model

Reuses the existing `referrals` table lifecycle (`pending` → `qualified` →
`rewarded`) rather than inventing a parallel one — a Free-tier seal-credit
referral and a Pro+ payment referral are still fundamentally "one referrer,
one referred org, one reward," just with a different trigger and payout.

`supabase/migrations/0046_referral_seal_credits.sql` (next available
number — `0045_rfc3161_timestamp.sql` is latest):

```sql
alter table public.referrals add column if not exists reward_type text
  check (reward_type in ('pro_month', 'seal_credits'));
alter table public.referrals add column if not exists credits_granted integer;
alter table public.referrals add column if not exists referred_credits_granted integer;
```

`reward_type` records which program actually paid out on this row (existing
rows backfilled to `'pro_month'` for the old behavior). `credits_granted`
mirrors `credit_purchases`' audit-trail pattern from the credit-pack
feature — don't just mutate `doc_credits` silently, leave a row explaining
why the balance moved. `referred_credits_granted` only populated if the
"reward the referred side too" decision above is yes.

No new counter/table needed for Super Referrer status — computed the same
way `/api/referral/me` already computes `rewardedCount` today: `count(*)
where referrer_org_id = X and status = 'rewarded' and reward_type =
'seal_credits'`. Crossing 3 is a read-time check, not a stored flag.

## Where this plugs into existing code

- **New qualifying-event hook**: `verified-badge-actions.ts`'s
  `sealDocumentAction`, right after a document's first-ever seal completes
  for that org — needs a "is this org's first seal" check (a count query
  against `documents.is_verified_badge`) and a lookup for a `pending`
  referral row where this org is the `referred_org_id`. Grants credits via
  the exact same compare-and-swap pattern `checkFreePlanDocCap` already
  uses to spend `doc_credits` (`plan.ts` lines ~219-227), just adding
  instead of subtracting.
- **`/api/referral/me`**: extend the response with `plan`, `rewardType`
  (`"pro_month" | "seal_credits"`), `creditsPerReferral` (5 or 10 depending
  on Super Referrer status), `isSuperReferrer`, and
  `sealCreditsRewardedCount` alongside the existing `rewardedCount` — both
  `referral-card.tsx` and `referral-gift-button.tsx` read this same
  endpoint, so branching lives in one place.
- **`referral-card.tsx` / `referral-gift-button.tsx`**: both need a
  plan-conditional copy branch (Free → seal-credits pitch + Super Referrer
  progress line, Pro+ → today's unchanged "give a month, get a month"
  copy). Two files, same shape of change — no shared component today, so
  this is genuinely two edits, not one.
- **Existing payment-triggered path** (`rewardReferrerOnFirstPayment`,
  `webhooks/stripe/route.ts`): unchanged, stays live for every plan per the
  "layer on top, don't replace" recommendation above.

## Effort

**Small-to-medium.** Every load-bearing mechanism already exists and is
proven: the `referrals` table lifecycle, the gift-box UI shell, and the
`doc_credits` compare-and-swap grant/spend pattern (built for credit packs,
reused here almost verbatim). The genuinely new pieces are: one migration
(three nullable columns), one new qualifying-event hook on first-seal
completion, extending one API response, and copy-branching two existing
components. Nothing here is new infrastructure the way the credit-pack
one-time-payment flow or the custom-domain verify-page idea elsewhere in
this repo were.

## Decided (2026-08-03)

1. **Layer-on-top, not replace.** Free referrers keep background
   eligibility for the existing free-month reward if their referred friend
   later actually subscribes — the seal-credits program is additive.
2. **5 / 10 credits, 3-referral threshold** — confirmed as specified above.
3. **Reward the referred side too** — confirmed yes, 3 credits on the
   referred org's own first seal, same triggering event.

## Decided (2026-08-03, edge case 4)

**Option A — reward-time plan check, no snapshot.** Confirmed. Full
reasoning and the two alternatives considered (and rejected) kept below
for the record.

A Free referrer shares their link, someone signs up under it, and then the
**referrer** upgrades to Pro+ before their referred friend ever seals a
document. When the referred friend finally does seal (the seal-credits
qualifying event), what does the now-Pro+ referrer get?

This isn't just a fairness question — there's a real technical wrinkle
underneath it. `doc_credits` is **only ever consulted by
`checkFreePlanDocCap`**, which early-returns `null` (uncapped, no credit
check at all) for any org where `plan !== "free"`. **Granting `doc_credits`
to an org that's since become Pro+ is dead value — nothing in the codebase
ever spends a paid org's credit balance.** Any option that can result in a
Pro+ org sitting on a stack of un-spendable seal credits needs to either
avoid that outcome or pair it with a way to actually use them.

**Option A — reward-time plan check, no snapshot (recommended).** Check
the referrer's plan live at the moment the referred org seals. Free at that
moment → seal credits, same as any other Free referral. Already upgraded
to Pro+ by then → **no seal-credit grant**, but that referral simply rolls
into being an ordinary Pro+ referral going forward: if the referred friend
later actually subscribes, the existing payment-triggered "give a month,
get a month" fires exactly as it would for any Pro+ referrer, no special
casing needed. Nothing lost, no dead credits ever minted, zero new state
(`reward_type` is decided at grant time, not stored speculatively). The
"cost" is that a referrer who upgraded mid-flight doesn't get *anything*
for a friend who seals but never subscribes — a genuinely rare double
edge case (upgrade timing + referred friend stops at "seal" and never
pays), and arguably fine: they're now benefiting from Pro+ itself, which
is worth far more than 5-10 credits.

**Option B — snapshot referrer's plan at capture time, honor it
regardless of later upgrades.** Add a `referrer_plan_at_capture` column;
if it was `"free"`, the seal-credits reward always pays out on schedule
even if the referrer is Pro+ by reward time. Guarantees "the deal you saw
is the deal you get." Directly creates the dead-credits problem above
unless paired with a second change — e.g. auto-converting any unspent
`doc_credits` into a small one-time Stripe account credit at the moment an
org upgrades, so the value doesn't just evaporate. More building, and a
second mechanism (credit→cash conversion) that doesn't exist anywhere in
this codebase today.

**Option C — resolve early, at the upgrade moment itself.** When an org
with a pending (not-yet-rewarded) Free-side referral upgrades to Pro+,
immediately treat that referral as converted to the Pro+ track — apply
`pending_referral_reward` logic right then rather than waiting for the
referred friend's future payment. Front-loads generosity (the referrer's
friend hasn't actually paid anything yet), which is a real cost, not just
a technicality — this is the most generous option and the most likely to
be gamed (upgrade a throwaway org right after a referral capture to
trigger an early reward). Not recommended without a stronger abuse
argument than the other two options need.

**Recommendation: Option A.** It's the only one of the three that can't
produce a stack of credits nothing in the app can ever spend, needs no new
column or mechanism, and the actual harm in the edge case it doesn't cover
(upgraded referrer, friend seals but never subscribes) is small and rare.
