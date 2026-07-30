import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, consoleMeteredPriceIdFor } from "@/lib/stripe";

// Console AI signing-ops product (CONSOLE_AI_SIGNING_SCOPE.md) — metered
// usage tracking + billing for Pro/Team orgs calling POST /api/v1/documents
// without a Business plan (see src/lib/api-auth.ts's `metered` flag).
//
// Uses Stripe's Billing Meters API (stripe.billing.meterEvents), not the
// older subscriptionItems.createUsageRecord — that method doesn't exist on
// the installed SDK (stripe ^22.3.0) any more; Stripe replaced it. This is
// actually simpler for the currency problem that originally blocked this
// file: a meter event is reported against a customer id and has no currency
// of its own at all — currency only matters for the *Price* object that
// converts recorded usage into an invoice line, which is why
// ensureConsoleSubscriptionItem below still needs to know the org's
// subscription currency, but recordConsoleUsage's actual event-reporting
// call doesn't.
//
// Setup this depends on, in Stripe (test mode first):
//   1. Create ONE Billing Meter, event_name exactly "console_document_sent"
//      (must match CONSOLE_METER_EVENT_NAME below) — this is global, not
//      per-currency.
//   2. Create a metered Price per currency you want to support, each
//      attached to that meter, and set its id as STRIPE_PRICE_CONSOLE_METERED
//      (USD) / _EUR / _GBP / _CHF in Vercel (see stripe.ts). You can start
//      with just USD configured — orgs on other currencies fall back to
//      local-only tracking (see the log line below) until their currency's
//      price is added, never a silent wrong-currency charge.
const CONSOLE_METER_EVENT_NAME = "console_document_sent";

// Idempotent: returns the org's existing metered subscription item id if
// one's already attached, otherwise attaches this org's currency-matched
// metered Price to their existing subscription and persists the item id so
// this only ever runs once per org. Returns null (never throws) if that
// currency's metered Price isn't configured yet.
async function ensureConsoleSubscriptionItem(
  orgId: string,
  stripeSubscriptionId: string,
  existingItemId: string | null
): Promise<string | null> {
  if (existingItemId) return existingItemId;

  const stripe = getStripe();
  const admin = createAdminClient();

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const currency = subscription.currency.toUpperCase();
  const priceId = consoleMeteredPriceIdFor(currency);
  if (!priceId) {
    console.error(
      `Console metered billing: no Stripe price configured for currency ${currency} ` +
        `(org ${orgId}). Set STRIPE_PRICE_CONSOLE_METERED_${currency} to enable real billing ` +
        `for this org — usage is still being tracked locally in the meantime.`
    );
    return null;
  }

  const item = await stripe.subscriptionItems.create({
    subscription: stripeSubscriptionId,
    price: priceId,
  });

  await admin.from("organizations").update({ console_subscription_item_id: item.id }).eq("id", orgId);
  return item.id;
}

export async function recordConsoleUsage(orgId: string): Promise<void> {
  const admin = createAdminClient();

  // Local counter first, and always — this is the dashboard-facing number
  // and must stay accurate even if Stripe reporting below fails or isn't
  // configured for this org's currency yet.
  try {
    const { data: org } = await admin
      .from("organizations")
      .select("console_usage_current_period, console_first_used_at")
      .eq("id", orgId)
      .single();

    await admin
      .from("organizations")
      .update({
        console_usage_current_period: (org?.console_usage_current_period ?? 0) + 1,
        console_first_used_at: org?.console_first_used_at ?? new Date().toISOString(),
      })
      .eq("id", orgId);
  } catch (err) {
    console.error("Console usage tracking (local counter) failed", { orgId, err });
  }

  // Real Stripe billing — separate try/catch so a Stripe hiccup never
  // rolls back the local counter above, and never blocks a real send (this
  // is always called fire-and-forget from the document-create route).
  try {
    const { data: org } = await admin
      .from("organizations")
      .select("stripe_customer_id, stripe_subscription_id, console_subscription_item_id")
      .eq("id", orgId)
      .single();

    if (!org?.stripe_customer_id || !org?.stripe_subscription_id) {
      // Pro/Team requires a paid subscription to reach this code path at
      // all, so this shouldn't happen — defensive only.
      console.error("Console usage: org has no Stripe customer/subscription, skipping Stripe report", { orgId });
      return;
    }

    const itemId = await ensureConsoleSubscriptionItem(
      orgId,
      org.stripe_subscription_id,
      org.console_subscription_item_id
    );
    if (!itemId) return; // currency not configured yet — already logged

    await getStripe().billing.meterEvents.create({
      event_name: CONSOLE_METER_EVENT_NAME,
      payload: { stripe_customer_id: org.stripe_customer_id, value: "1" },
    });
  } catch (err) {
    console.error("Console usage Stripe reporting failed", { orgId, err });
  }
}
