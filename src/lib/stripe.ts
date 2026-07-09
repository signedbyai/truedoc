import Stripe from "stripe";

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

export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const entry = (Object.entries(PLAN_PRICE_IDS) as [PlanId, string | undefined][]).find(
    ([, id]) => id === priceId
  );
  return entry ? entry[0] : null;
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://signedby.ai").replace(/\/$/, "");
}
