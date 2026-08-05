import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Shared client-side Stripe.js loader (2026-08-05, extracted from
// verified-badge-settings.tsx when the dashboard's own Verified Badge tab
// needed the exact same "open Stripe's hosted identity-verification modal"
// logic — see new-document-client.tsx's handleVerifyIdentity. One cached
// promise module-wide so both the dark Console Settings panel and the light
// dashboard flow never each load the Stripe.js script twice. Needs
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set (client-side Stripe.js) — distinct
// from the server-side STRIPE_SECRET_KEY.
let stripeClientPromise: Promise<Stripe | null> | null = null;

export function getStripeClient() {
  if (!stripeClientPromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripeClientPromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripeClientPromise;
}
