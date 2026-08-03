# Scope: Razorpay + India PPP tier — smart gateway router

Status: SCOPED 2026-08-03; **V0.5 BUILT same day, all 4 Stripe Price
objects created, env vars + deploy are the only remaining step** (not
something I can do — no Vercel env-var-write tool available; user's own
manual step, same as every other Stripe env var this session).
Direct request, prompted by traffic data showing a Reddit-driven surge to
`/verified-badge`: add Razorpay as a second payment gateway for Indian
customers, routed automatically by location, defaulting to UPI Intent for
mandate approval on-device, with a PPP-discounted price tier. Pasted
reference architecture reviewed and adapted against SignedBy's actual code
below — the shape is right, several specifics don't match this codebase
and are corrected inline. **V0.5 (Stripe-only INR probe, see that section
below) shipped as a deliberately cheap first step before committing to the
Razorpay onboarding timeline** — INR added to the existing currency system
(`currencyForCountry("IN") → "INR"`), ₹259/₹529/₹1099 PPP-discounted
display prices, and per-plan Stripe Price ID lookups
(`PLAN_PRICE_IDS_INR`) with the existing USD-fallback safety net. Lean V1
and the full Razorpay build remain unbuilt, pending real conversion data
from this probe.

## Read this first: the real gating step isn't engineering

Before any of the code below matters, **SignedBy needs to onboard as a
Razorpay merchant** — and the standard path doesn't fit: SPRK10 B.V. is a
Netherlands entity with no Indian subsidiary, and a vanilla Razorpay
merchant account assumes an Indian-registered business with an Indian
settlement bank account.

**The product that fits is Razorpay's cross-border offering** (marketed as
"Import" / built on their PA-CB — Payment Aggregator Cross-Border —
license), which explicitly exists for this exact situation: a foreign
company accepting UPI/card payments from Indian customers, settling
internationally, with **no Indian entity or bank account required**.
Onboarding is video-KYC based and needs a Board Resolution + Power of
Attorney rather than Indian incorporation paperwork, and their own
marketing explicitly lists "enable subscriptions" as supported — so
recurring billing (not just one-time payments) is in scope for this
product, confirming the core ask is feasible. Onboarding is on Razorpay's
timeline (they cite "within days" once KYC + integration are done), not
something engineering can shortcut — **worth starting that conversation
with Razorpay now, in parallel with any build work, since it can't be
tested end-to-end without a live account either way.**

## Current architecture — what actually exists today (corrects the pasted reference doc)

The pasted architecture assumes a generic greenfield setup. SignedBy's
actual billing code is more specific, and several assumptions need
adjusting:

- **No payment-gateway abstraction exists anywhere.** `organizations` has
  `stripe_customer_id` / `stripe_subscription_id` directly (no `gateway`
  enum, no generic `external_customer_id`), and `plan` is a plain
  check-constrained text column. The pasted doc's "add a `gateway` enum
  column" advice is correct and necessary — just confirming it's not
  already half-built.
- **Location detection already exists — and it's IP-based, not a new
  thing to add.** `src/lib/currency.server.ts`'s `getRequestCurrency()`
  already reads Vercel's edge geolocation header (`x-vercel-ip-country`)
  to pick a display currency, with a cookie override for manual switching.
  The pasted doc's step 2 ("ping an IP geolocation service") is already
  solved infrastructure here — a Razorpay router extends this same
  function/header rather than adding MaxMind or a third-party geo API.
- **`syncSubscription()` — the one function that actually activates a
  paid plan — is typed to `Stripe.Subscription`.** It writes
  `organizations.plan`, upserts the `subscriptions` table, and seeds an
  example template, all from a live Stripe object's shape
  (`subscription.items.data[0]?.price?.id`, etc.). A Razorpay webhook
  **cannot call this directly** without either faking a fragile
  Stripe-shaped object or (recommended) extracting a small gateway-neutral
  DTO — `{orgId, plan, status, externalCustomerId, externalSubscriptionId,
  currentPeriodEnd}` — that both webhooks populate from their own
  provider's payload. This is the single highest-leverage refactor in this
  scope, and it needs to happen regardless of which other decisions land.
- **Signature verification is genuinely separate work, not reusable.**
  Stripe's webhook route verifies via `stripe.webhooks.constructEvent()`
  (their SDK). Razorpay verifies via raw HMAC-SHA256 over the request body
  using Node's `crypto` module and a webhook secret from the Razorpay
  dashboard — different header (`x-razorpay-signature` vs
  `stripe-signature`), different verification code, own route
  (`/api/webhooks/razorpay`), same "use the raw body, not parsed JSON"
  constraint as the existing Stripe route.
- **Gateway choice needs to be a persisted, sticky decision — not
  re-guessed on every checkout.** The existing checkout route already has
  a "locked currency wins over geo guess" rule (a Stripe Customer can't
  mix currencies once it has billing history) — gateway choice needs the
  identical shape: once an org has `payment_gateway` set (from a completed
  checkout or an active subscription), every future checkout reads that
  stored value instead of re-checking IP country. Otherwise an Indian
  customer who started on Stripe while traveling, or a VPN user, could get
  silently re-routed mid-relationship.
- **Metered/console billing has no Razorpay equivalent as clean as
  Stripe's Billing Meters API.** If Indian Team/Business orgs need
  Console's metered overage billing eventually, that's a separate,
  smaller-scoped follow-on (a local-usage-counter + periodic invoice
  design), not something this scope needs to solve now — flagging so it
  doesn't get assumed as "just works" once the base gateway exists.
- **The credit-pack fallback the pasted doc calls for already exists in
  spirit.** `doc_credits` / `credit_purchases` (the $5-for-25-seals
  one-time-payment feature) is the exact "prepaid instead of recurring
  card" pattern India needs — its own code comment already cites
  "India/recurring-card-friction" as part of the original reasoning for
  building it. A Razorpay version doesn't need new product thinking, just
  a parallel one-time-order flow crediting the same `doc_credits` column,
  with idempotency keyed on a Razorpay payment id instead of
  `stripe_checkout_session_id` (that column is Stripe-specific today and
  would need a sibling, not a shared unique constraint).

## Routing design (adapted from the pasted reference, not copied)

1. **First checkout for an org with no `payment_gateway` set**: resolve
   country the same way currency already does
   (`x-vercel-ip-country`/cookie override) → `IN` routes to Razorpay,
   everything else to Stripe, same as the pasted doc's step 3 — this part
   of the pasted architecture is correct as-is.
2. **Every subsequent checkout**: read the org's stored `payment_gateway`
   column, ignore geo entirely. This is the piece the pasted doc doesn't
   cover and SignedBy's existing currency-lock precedent makes necessary.
3. **VPN guardrail — the pasted doc's core insight holds up and doesn't
   need extra work bolted on.** UPI Autopay mandate registration requires
   a real Indian bank account linked to an Indian mobile number — someone
   VPNing into an Indian IP from abroad cannot complete that flow, full
   stop. Unlike the pasted doc's generic "also check card-issuing-country
   via Stripe Radar" advice, that's not really needed here: the abuse
   direction that matters (someone spoofing India to get the *cheap*
   price) is already blocked at the payment-instrument level, for free,
   by UPI's own mechanics. No separate fraud-detection integration needed
   for this specific abuse pattern.

## PPP price recommendation

There's no India-specific price anywhere in the codebase today — `currency.ts`'s
`PRICE_TABLE` is a hand-tuned "roughly consistent premium over USD" table
(EUR/GBP/CHF), not a parity-based one, so this is a genuinely new pricing
decision, not an extension of existing logic.

**Recommendation: ~55% off the $7 Pro price → $3.15/mo, priced in INR as a
round ₹259/mo** (at a mid-2026 rate of roughly ₹84/USD). Reasoning:
- Common SaaS PPP frameworks put India in a "Tier 3" bucket at roughly a
  50% discount as a starting point; some products go steeper (Spotify's
  India price is roughly 7x cheaper than its US price) — 55% is a
  reasonable, defensible middle that doesn't require re-litigating the
  whole pricing page's philosophy.
- **Comfortably under the RBI's ₹15,000-per-debit AFA-free threshold**
  (confirmed current via Razorpay's own docs, 2026 e-mandate framework) —
  a ₹259/mo mandate never triggers the extra UPI-PIN-approval step on
  recurring debits, so the "approve once, then it's automatic" promise in
  the original request actually holds every month, not just at signup.
  This is worth stating explicitly since it's the thing that makes UPI
  Autopay actually low-friction here, not just cheap.
- A single flat India price (not a second full PPP tier ladder across
  Team/Business too) keeps this scoped — extending PPP pricing to every
  plan and to markets beyond India is a natural next question but
  deliberately out of scope for a first version.

## Data model

New columns needed on `organizations` (exact migration number depends on
build order relative to other pending-but-unbuilt migrations):

```sql
alter table public.organizations add column if not exists payment_gateway text
  check (payment_gateway in ('stripe', 'razorpay'));
alter table public.organizations add column if not exists razorpay_customer_id text;
alter table public.organizations add column if not exists razorpay_subscription_id text;
```

`subscriptions` table gets the same two new columns for consistency with
its existing Stripe-mirroring shape. `credit_purchases` needs a sibling
idempotency column (`razorpay_payment_id`, nullable, its own unique
constraint) rather than trying to share `stripe_checkout_session_id`.

## Where this plugs into existing code

- **`src/lib/currency.server.ts`**: new `gatewayForCountry()` (or extend
  `currencyForCountry`) — same header, new output.
- **`src/lib/stripe.ts`**: no change to Stripe-side logic; a new sibling
  `src/lib/razorpay.ts` holds Razorpay SDK init, order/subscription
  creation, and the INR price constant.
- **`src/app/api/billing/checkout/route.ts`**: gains a gateway branch near
  the top — Razorpay path creates a Razorpay Customer + Subscription
  (UPI Intent as the recommended registration flow per Razorpay's own
  docs, card e-mandate as an iOS/fallback path) and returns Razorpay's
  `order_id`/short URL instead of a Stripe Checkout Session URL.
- **New `src/app/api/webhooks/razorpay/route.ts`**: HMAC verification,
  listens for `subscription.charged` (recurring debit succeeded) and
  `payment.captured` (one-time/credit-pack), calls the extracted neutral
  `syncSubscription`-equivalent DTO handler shared with the Stripe route.
- **`src/lib/generate-signed-pdf.ts`, referral logic, Trustpilot
  upgrade-email trigger**: all currently assume a Stripe event fired —
  each needs a decision on whether it also fires from the Razorpay path
  (referrals almost certainly should; Trustpilot's AFS integration is
  Stripe-specific plumbing and may not have a Razorpay equivalent without
  its own check).

## Effort

**Large — the biggest scope item from this session by a clear margin.**
Bigger than the custom-domain verify-page idea flagged elsewhere as "the
single most expensive item" in an earlier doc, for a different reason:
this isn't infrastructure-heavy so much as it's **gated by an external
business process** (Razorpay KYC/onboarding, on their timeline, blocking
any real end-to-end testing) stacked on top of a genuine refactor
(extracting the gateway-neutral DTO so `syncSubscription`'s logic isn't
duplicated), a new webhook with its own signature scheme, a brand-new
pricing tier, and compliance research that's specific to Indian recurring
payments (AFA thresholds, mandate lifecycle) with no existing pattern in
this codebase to lean on. None of the Razorpay-side integration can be
smoke-tested from this sandbox (same outbound-network restriction that
blocked live Stripe/TSA calls earlier this session) — real verification
needs a live Razorpay test-mode account, which itself depends on the
onboarding step above.

## Lean V1 — a genuinely smaller slice, not just "build it carefully"

The full scope above generalizes for the long run (a `payment_gateway`
enum, a gateway-neutral DTO refactor of `syncSubscription`, referral +
credit-pack + Team/Business parity). None of that is required to get a
real Indian customer paying via UPI Autopay. Here's the smaller version:

**Core simplification: don't build a new "gateway router" concept at
all — extend the currency router that already exists and is already
live.** `currencyForCountry()` already turns an IP-detected country into
a `Currency`, with a manual-override cookie for anyone who wants to
switch. Adding `"INR"` as one more `Currency` value, mapping `IN → INR`,
and then having checkout say *"if currency is INR, use Razorpay instead
of Stripe"* collapses gateway selection into a mechanism that's already
built, tested, and live — rather than inventing a parallel routing layer
next to it.

**What actually ships in a lean V1:**
1. `Currency` gains `"INR"`; one new `PRICE_TABLE` row (₹259, Pro only —
   Free stays free, **Team/Business simply aren't offered to India yet**,
   which conveniently also sidesteps the console-metered-billing question
   entirely, since only Team/Business use that).
2. `currencyForCountry("IN") → "INR"` — one line.
3. New `src/lib/razorpay.ts`: SDK init + a `createSubscription()` helper
   (UPI Intent registration only — no Collect fallback, no one-time-order
   helper for credit packs).
4. Checkout route grows one `if (currency === "INR")` branch that creates
   a Razorpay subscription and returns its order info instead of a Stripe
   Checkout URL — kept as a clearly separate code block, not woven into
   Stripe's request/response shape, so there's no way a Razorpay bug
   touches the live Stripe path.
5. Two new nullable columns, `razorpay_customer_id` /
   `razorpay_subscription_id`, on `organizations`. **No `payment_gateway`
   enum column** — once `razorpay_subscription_id` is set, that's the
   signal an org is Razorpay-billed; nothing else needs to ask the
   question before a subscription exists, since routing is just
   "whatever currency resolves to right now."
6. New `/api/webhooks/razorpay` route, **listening to exactly one event**
   (`subscription.charged`) — a small standalone function writes
   `organizations.plan = 'starter'` directly. Deliberately **not** routed
   through `syncSubscription()` — duplicating a few lines of "activate
   the plan" logic is cheaper and safer for a V1 than refactoring
   proven, revenue-critical Stripe code before Razorpay has ever
   processed a real payment.
7. Frontend: when checkout returns a Razorpay order instead of a Stripe
   session, initialize Razorpay's JS modal (`new Razorpay(options).open()`)
   instead of redirecting to Stripe.

**Explicitly deferred, each a real follow-on rather than a requirement:**
- `payment_gateway` enum + generalized sticky-lock read path
- The `syncSubscription` DTO refactor (worth it once Razorpay is proven,
  or if a third gateway ever shows up)
- Referral program payouts for Razorpay-billed orgs
- Credit-pack top-ups via Razorpay (India's Free-tier users still only
  see the existing Stripe/USD credit pack for now)
- Team/Business India pricing and Console metered billing for India
- UPI Collect as an iOS fallback (ship Intent-only, revisit if real
  iOS conversion data says it's needed)
- Mirroring the `subscriptions` table for Razorpay orgs — worth
  confirming nothing else actually reads that table before deciding
  it's safe to skip; not confirmed either way in this pass.

**Effort: Medium, not Large.** Still gated by the same external Razorpay
onboarding step — that timeline doesn't shrink regardless of code scope —
but the engineering footprint drops a lot: no schema-abstraction
decision, zero changes to proven Stripe code, one webhook event instead
of a general framework, one plan tier instead of three. This is the
version worth actually building first; the full doc above is where it
grows into once Razorpay-billed India revenue is real and a second gateway
stops being a one-off.

## V0.5 — Stripe-only, no Razorpay at all: real, but a narrower bet, not just a smaller one

Checked this directly rather than assuming: **Stripe does support INR
presentment and RBI-e-mandate-compliant recurring card billing** — there's
a dedicated `docs.stripe.com/payments/upi/upi-autopay` integration and
Stripe's PaymentIntents/SetupIntents flow already automates the pre-debit
notification + AFA handling the 2026 e-mandate framework requires. On the
surface that sounds like it could skip Razorpay entirely.

**It can't, for one specific reason that matters a lot here: a
foreign-registered Stripe account (which is what SPRK10 B.V. has, same as
the Razorpay problem above) can accept India-issued **cards** in INR, but
cannot collect via UPI, NetBanking, or Indian wallets at all** — those
payment methods are only available through Stripe's India-domestic
product, gated behind having an actual Indian-registered business entity,
the exact same blocker that ruled out a vanilla Razorpay account. The UPI
Autopay integration docs that turned up are for Stripe's India-domestic
accounts, not accounts like SignedBy's would be.

So V0.5 is real, but it's a **different, narrower product**, not a smaller
version of the same one:

- **What it delivers**: Indian customers with an international-capable
  credit/debit card can subscribe at an INR price, entirely on Stripe.
  Genuinely close to zero new code — add `"INR"` to `Currency`, one new
  Stripe Price object, `currencyForCountry("IN") → "INR"`. No new vendor,
  no KYC/onboarding gate, no new webhook, no new checkout branch beyond
  currency. This is meaningfully cheaper than even the lean V1 above —
  it's "another currency," not "another gateway," to every existing code
  path.
- **What it explicitly does not deliver**: the actual request. No UPI —
  which was the specific mechanism asked for ("approve the mandate
  directly on their mobile device"). No NetBanking, no wallets. It only
  reaches the segment of Indian customers who both have an
  international-capable card and are comfortable putting it on a
  subscription — which skews away from exactly the audience PPP pricing
  is usually reaching for (India's credit-card penetration is low; UPI is
  the default digital-payment rail for most people, not a fallback).
- **Worse conversion even for the segment it does reach**: foreign-merchant
  Stripe accounts see meaningfully higher India-card decline rates than a
  domestic-licensed processor, specifically because of how RBI's
  AFA/tokenization rules get handled by a non-domestic account — this
  isn't just "fewer payment methods," it's "the one payment method it does
  offer converts worse than it would on Razorpay too."

**Where V0.5 is actually useful**: as a near-zero-cost probe to test
whether India demand is real at all before committing to the Razorpay
onboarding timeline — ship the INR price on Stripe, see if anyone
converts on a card, and let that inform whether the Razorpay investment
(lean V1 or full) is worth prioritizing. It's not a substitute for the
original request, it's a cheap way to de-risk it.

**All four Stripe Price objects created 2026-08-03** — Pro
`price_1U0GWmAakFH9efzt9yxRmbkB`, Team `price_1U0GXbAakFH9efzt08ISIab8`,
Business `price_1U0GYEAakFH9efztBGwQrW61`, Console metered
`price_1U0GdvAakFH9efztwCoN9R19`. **Only remaining step: set the four
env vars below in Vercel, then deploy** — no code changes left.

```
STRIPE_PRICE_STARTER_INR=price_1U0GWmAakFH9efzt9yxRmbkB
STRIPE_PRICE_TEAM_INR=price_1U0GXbAakFH9efzt08ISIab8
STRIPE_PRICE_BUSINESS_INR=price_1U0GYEAakFH9efztBGwQrW61
STRIPE_PRICE_CONSOLE_METERED_INR=price_1U0GdvAakFH9efztwCoN9R19
```

**BUILT 2026-08-03 — pre-deploy blockers, not optional:**
`currency.ts`/`stripe.ts` are wired (INR added to `Currency`,
`currencyForCountry("IN") → "INR"`, ₹259/₹529/₹1099 display prices,
`PLAN_PRICE_IDS_INR` reading `STRIPE_PRICE_STARTER_INR` /
`_TEAM_INR` / `_BUSINESS_INR`). `priceIdFor()`'s existing USD-fallback
means the app won't crash without those env vars — but **an Indian
visitor would see ₹259 on `/pricing` and land on a $7 USD Stripe
Checkout page**, a real, visible price-mismatch bug, not a cosmetic gap.
**Create the three INR Stripe Price objects (recurring monthly, ₹259 /
₹529 / ₹1099) and set the three env vars in Vercel before this deploys.**

**Console metered overage also needs its own 4th Price object.**
`CONSOLE_METERED_PRICE_IDS` (the per-doc overage billing above the
50-free/month allowance) gained an `INR` slot reading
`STRIPE_PRICE_CONSOLE_METERED_INR` — same pattern as the EUR/GBP/CHF
metered prices already configured there. Recommend ~₹8/doc (the same
~55%-off-nominal PPP ratio as the flat plan prices, not a straight FX
conversion of $0.20 (~₹16.8) — otherwise a heavy Console user in India
pays proportionally more than a light single-subscription one, which
undercuts the whole point of PPP pricing). Unlike the flat-plan
fallback, `consoleMeteredPriceIdFor` has **no USD fallback by design** —
until this is configured, an Indian Pro+ org using Console just stays on
local-only usage tracking with no live Stripe billing for their
overage. Safe (never misbills or blocks), but it's a real revenue gap
until set, not just a display one.

Everything else (checkout route, webhook, pricing page, currency
switcher, Magic Quote's currency picker) already works unmodified — INR
rides the same currency-resolution pipeline every other currency uses,
confirmed via `tsc`/full `vitest` (565 tests, all green) with zero other
files needing changes.

## Open questions — real decisions, not defaults I'd pick for you

1. **Start the Razorpay onboarding conversation now, in parallel with any
   build work** — confirm, since it's the true critical path and has zero
   engineering dependency.
2. **₹259/mo (~55% off) for India Pro** — my recommendation, grounded in
   typical PPP-tier practice and the AFA-threshold headroom above. Confirm
   or override; whether it also extends to Team/Business is a separate
   question worth deferring to a follow-on once Pro-tier Razorpay billing
   is proven.
3. **Does the existing referral program (give a month, get a month) pay
   out for Razorpay-billed orgs?** Recommend yes, same trigger logic
   (`subscription.charged` for Razorpay standing in for Stripe's
   `invoice.payment_succeeded`), but it's new code either way, not
   automatic.
4. **Console metered billing for India Team/Business** — explicitly
   deferred, not solved by this scope (no Razorpay equivalent to Stripe's
   Meters API exists to reuse).
5. **UPI Collect as an iOS fallback** — Razorpay's own guidance recommends
   UPI Intent as primary with Collect as a fallback for iOS Safari/webview
   contexts that don't support the Intent flow's app-switch handoff well;
   confirm this fallback is worth building in v1 or acceptable to skip
   until real usage data shows it's needed.
