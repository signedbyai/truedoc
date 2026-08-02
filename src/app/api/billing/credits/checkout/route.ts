import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { getStripe, appUrl, CREDIT_PACK_PRICE_USD_CENTS, CREDIT_PACK_CREDITS } from "@/lib/stripe";

// Pay-as-you-go credit pack checkout (CONSOLE_FREE_TIER_SCOPE.md item #8,
// built 2026-08-03) — a one-time $5 purchase for 25 extra document seals,
// for a Free org that's hit its 3-doc/month cap and would rather top up
// than subscribe. Deliberately separate from /api/billing/checkout (which
// is subscription-mode only, plan-restricted to starter/team/business) —
// this is the app's first mode: "payment" Checkout session, and reuses
// none of that route's currency/plan-price machinery since the pack is a
// flat USD price with no plan concept at all.
//
// No request body needed — there's exactly one pack (see stripe.ts), not a
// menu of sizes, so there's nothing for the client to choose.
export async function POST() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("name, stripe_customer_id").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const stripe = getStripe();

  try {
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
      await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: CREDIT_PACK_PRICE_USD_CENTS,
            product_data: {
              name: `SignedBy credit pack — ${CREDIT_PACK_CREDITS} document seals`,
              description: "One-time top-up, no subscription. Credits never expire.",
            },
          },
          quantity: 1,
        },
      ],
      // Same hardcoded /dashboard/billing landing spot the subscription
      // checkout uses today — the "return to wherever you actually came
      // from" refinement (CONSOLE_FREE_TIER_SCOPE.md's 1a) is a known,
      // still-deferred gap for both flows, not something this route
      // solves on its own.
      success_url: `${appUrl()}/dashboard/billing?credits=1`,
      cancel_url: `${appUrl()}/dashboard/billing?credits_canceled=1`,
      // metadata (not subscription_data — this is a one-time payment, no
      // subscription object exists) is what the webhook keys off of to
      // route this to grantCreditPack() instead of the plan-sync path.
      metadata: { org_id: orgId, type: "credit_pack", credits: String(CREDIT_PACK_CREDITS) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Credit pack checkout session failed", err);
    const message = err instanceof Error ? err.message : "Couldn't start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
