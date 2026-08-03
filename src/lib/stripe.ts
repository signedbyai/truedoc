import Stripe from "stripe";
import { CREDIT_PACK_PRICE_CENTS, type Currency } from "@/lib/currency";

export type PlanId = "starter" | "team" | "business";

let client: Stripe | null = null;

export function getStripe() {
  if (client) return client;
  client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

// Team and Business are flat-rate for v1 (no per-seat quantity syncing yet —
// see FIX_BACKLOG.md-style note: upgrade to true per-seat billing post-launch
// once it's actually needed).
export const PLAN_PRICE_IDS: Record<PlanId, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  team: process.env.STRIPE_PRICE_TEAM,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

// Non-USD prices — separate Stripe Price objects (created via the dashboard's
// "add a price" flow, which is why they're distinct IDs rather than
// currency_options on the USD price). Selected at checkout by the customer's
// resolved currency; when a price id is unset we fall back to the USD price so
// a missing env var never blocks a sale.
export const PLAN_PRICE_IDS_EUR: Record<PlanId, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER_EUR,
  team: process.env.STRIPE_PRICE_TEAM_EUR,
  business: process.env.STRIPE_PRICE_BUSINESS_EUR,
};

export const PLAN_PRICE_IDS_GBP: Record<PlanId, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER_GBP,
  team: process.env.STRIPE_PRICE_TEAM_GBP,
  business: process.env.STRIPE_PRICE_BUSINESS_GBP,
};

export const PLAN_PRICE_IDS_CHF: Record<PlanId, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER_CHF,
  team: process.env.STRIPE_PRICE_TEAM_CHF,
  business: process.env.STRIPE_PRICE_BUSINESS_CHF,
};

// INR (RAZORPAY_INDIA_SCOPE.md's "V0.5" — Stripe cards only, no Razorpay/
// UPI yet). IMPORTANT deploy-order gotcha, same shape as the other
// per-currency tables' "falls back to USD" comment above, but worth
// spelling out explicitly here because the gap is more visible for a
// brand-new currency than for an existing one: until
// STRIPE_PRICE_STARTER_INR (etc.) is actually set in Vercel, an Indian
// visitor sees currency.ts's ₹259 on /pricing, but priceIdFor()'s
// fallback below sends them to Stripe Checkout on the USD $7 Price
// instead — a real, visible price-mismatch bug, not just a missing
// discount. Create the Stripe Price objects (INR, recurring monthly,
// ₹259/₹529/₹1099) and set these three env vars BEFORE this currency
// goes live in `currencyForCountry`, not after.
export const PLAN_PRICE_IDS_INR: Record<PlanId, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER_INR,
  team: process.env.STRIPE_PRICE_TEAM_INR,
  business: process.env.STRIPE_PRICE_BUSINESS_INR,
};

const PRICE_TABLES_BY_CURRENCY: Record<Currency, Record<PlanId, string | undefined>> = {
  USD: PLAN_PRICE_IDS,
  EUR: PLAN_PRICE_IDS_EUR,
  GBP: PLAN_PRICE_IDS_GBP,
  CHF: PLAN_PRICE_IDS_CHF,
  INR: PLAN_PRICE_IDS_INR,
};

// Currency-aware price selection: that currency's price when configured,
// otherwise the USD price.
export function priceIdFor(plan: PlanId, currency: Currency): string | undefined {
  return PRICE_TABLES_BY_CURRENCY[currency][plan] ?? PLAN_PRICE_IDS[plan];
}

// Maps a price id in any supported currency back to a plan, so the webhook
// sets the right plan regardless of which currency the customer subscribed in.
export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const table of Object.values(PRICE_TABLES_BY_CURRENCY)) {
    const entry = (Object.entries(table) as [PlanId, string | undefined][]).find(([, id]) => id === priceId);
    if (entry) return entry[0];
  }
  return null;
}

// Console metered billing (CONSOLE_AI_SIGNING_SCOPE.md) — a separate,
// usage-based Price per currency, NOT part of PLAN_PRICE_IDS above. Unlike
// the flat-rate plan prices (picked once at checkout time from a
// request-time cookie/geo), this price gets attached to an org's *existing*
// subscription after the fact, on their first metered console API call — so
// there's no "fall back to USD" here the way priceIdFor has: a subscription
// item must share its subscription's actual billing currency, and attaching
// a USD-denominated item to a EUR subscription would just fail at Stripe's
// API, not silently bill the wrong amount. See console-usage.ts's
// ensureConsoleSubscriptionItem, which reads the currency live off the
// org's Stripe subscription rather than guessing at it, and deliberately
// returns null (skips Stripe reporting, keeps the local usage count only)
// when that currency's price isn't configured yet, instead of falling back.
export const CONSOLE_METERED_PRICE_IDS: Record<Currency, string | undefined> = {
  USD: process.env.STRIPE_PRICE_CONSOLE_METERED,
  EUR: process.env.STRIPE_PRICE_CONSOLE_METERED_EUR,
  GBP: process.env.STRIPE_PRICE_CONSOLE_METERED_GBP,
  CHF: process.env.STRIPE_PRICE_CONSOLE_METERED_CHF,
  // INR (2026-08-03) — a 4th Stripe Price object is needed here, same as
  // the three flat-plan ones: metered/graduated pricing, INR, recurring,
  // reported via the Billing Meters API same as the other currencies.
  // Recommend ~₹8/doc, matching the flat plan prices' ~55%-off-nominal PPP
  // discount ($0.20 nominal x 84 x 0.45 ~ ₹7.56) rather than a straight
  // FX conversion (~₹16.8) — a heavy Console user in India shouldn't end
  // up paying proportionally MORE than a light single-subscription one
  // just because only the flat price got the PPP treatment. Until this
  // env var is set, consoleMeteredPriceIdFor has NO USD-fallback by
  // design (see the comment above) — an Indian Console org just stays on
  // local-only usage tracking, no live Stripe metered reporting. Safe
  // (never blocks or misbills), but it IS a real revenue gap, not just a
  // display gap, unlike the flat-plan fallback above: SignedBy simply
  // doesn't invoice that org's overage at all until this is configured.
  INR: process.env.STRIPE_PRICE_CONSOLE_METERED_INR,
};

export function consoleMeteredPriceIdFor(currency: string): string | undefined {
  return CONSOLE_METERED_PRICE_IDS[currency as Currency];
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://signedby.ai").replace(/\/$/, "");
}

// Pay-as-you-go credit pack (CONSOLE_FREE_TIER_SCOPE.md item #8, built
// 2026-08-03, price changed same day $10→$5) — a single 25-seal pack.
// Priced via Stripe Checkout's inline price_data rather than a
// dashboard-created Price object, so unlike the subscription plans
// (PLAN_PRICE_IDS_EUR/GBP/CHF above) there's nothing to configure in
// Stripe before a new currency works here — see
// /api/billing/credits/checkout.
//
// Went EUR/GBP/CHF-aware 2026-08-01 (direct bug report: a Europe-based
// visitor still saw and was charged a flat $5 — this was USD-only at
// launch, "the original ask didn't call for multi-currency"). The actual
// price table (CREDIT_PACK_PRICE_CENTS) lives in currency.ts, not here —
// that file is client-safe (no Stripe SDK import), so the console chat
// "Buy 25 more" button can format the same table directly
// (formatCreditPackPrice) without this server-only module ever reaching
// the client bundle.
//
// INR intentionally NOT in that table yet — the India pricing work
// (RAZORPAY_INDIA_SCOPE.md) was scoped specifically around the recurring
// Pro subscription price, not this one-time product. Unlike the flat plan
// prices (priceIdFor falling back to a USD *Price object* while Checkout
// still reports the currency as USD to the customer, since Checkout
// derives currency from whichever Price it's given), creditPackPriceFor
// below falls back to BOTH the USD amount and the USD currency code
// together — so an Indian visitor sees/pays a plain $5 via price_data,
// same experience as before this fix, rather than the amount alone
// falling back while `currency` stays "inr" (which would silently charge
// ₹5.00 — essentially free — since price_data has no fallback machinery
// of its own the way a pre-created Price object does).
export function creditPackPriceFor(currency: Currency): { currency: Currency; amountCents: number } {
  const amountCents = CREDIT_PACK_PRICE_CENTS[currency];
  if (amountCents === undefined) return { currency: "USD", amountCents: CREDIT_PACK_PRICE_CENTS.USD! };
  return { currency, amountCents };
}
export const CREDIT_PACK_CREDITS = 25;
