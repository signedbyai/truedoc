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

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://signedby.ai").replace(/\/$/, "");
}
