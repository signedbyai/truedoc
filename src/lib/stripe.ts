import Stripe from "stripe";
import type { Currency } from "@/lib/currency";

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

const PRICE_TABLES_BY_CURRENCY: Record<Currency, Record<PlanId, string | undefined>> = {
  USD: PLAN_PRICE_IDS,
  EUR: PLAN_PRICE_IDS_EUR,
  GBP: PLAN_PRICE_IDS_GBP,
  CHF: PLAN_PRICE_IDS_CHF,
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
};

export function consoleMeteredPriceIdFor(currency: string): string | undefined {
  return CONSOLE_METERED_PRICE_IDS[currency as Currency];
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://signedby.ai").replace(/\/$/, "");
}

// Pay-as-you-go credit pack (CONSOLE_FREE_TIER_SCOPE.md item #8, built
// 2026-08-03, price changed same day $10→$5) — a single $5/25-seal pack,
// USD only for v1 (no EUR/GBP/CHF variant the way the subscription plans
// have — the original ask didn't call for multi-currency, and a fixed USD
// price keeps this a one-line price_data object instead of another
// per-currency table). Priced via Stripe Checkout's inline price_data
// rather than a dashboard-created Price object, so there's nothing to
// configure in Stripe before this works — see /api/billing/credits/checkout.
export const CREDIT_PACK_PRICE_USD_CENTS = 500;
export const CREDIT_PACK_CREDITS = 25;
