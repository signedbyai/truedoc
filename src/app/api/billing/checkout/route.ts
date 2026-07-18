import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { getStripe, priceIdFor, appUrl, type PlanId } from "@/lib/stripe";
import { referralCouponId } from "@/lib/referral";
import { getRequestCurrency } from "@/lib/currency.server";

const bodySchema = z.object({
  plan: z.enum(["starter", "team", "business"]),
});

export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan: PlanId = parsed.data.plan;

  // Same geo/cookie resolution the pricing pages use, so a visitor is charged
  // the currency they were shown. EUR customers get the dedicated EUR price;
  // priceIdFor falls back to the USD price if the EUR price env var isn't set,
  // so a missing config degrades to a USD sale rather than a hard failure.
  const currency = await getRequestCurrency();
  const priceId = priceIdFor(plan, currency);
  if (!priceId) {
    return NextResponse.json({ error: "That plan isn't configured yet." }, { status: 500 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, stripe_customer_id, referred_by_org_id, pending_referral_reward")
    .eq("id", orgId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Referral coupon ("give a month, get a month"). Two ways it applies:
  //   welcome — this org was referred and hasn't used its free month yet.
  //   reward  — this org earned a free month by referring someone (and was on
  //             the free plan when it landed, so it's redeemed here).
  // Skipped entirely if no coupon is configured, so checkout never breaks on a
  // missing STRIPE_REFERRAL_COUPON. Bookkeeping happens in the webhook on
  // actual completion (so an abandoned checkout doesn't burn the discount).
  const coupon = referralCouponId();
  let referralContext: "welcome" | "reward" | null = null;
  if (coupon) {
    if (org.pending_referral_reward) {
      referralContext = "reward";
    } else if (org.referred_by_org_id) {
      const { data: ref } = await supabase
        .from("referrals")
        .select("referred_discount_applied")
        .eq("referred_org_id", orgId)
        .single();
      if (ref && !ref.referred_discount_applied) referralContext = "welcome";
    }
  }

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
      mode: "subscription",
      customer: customerId,
      // The selected price is already denominated in the right currency
      // (USD or EUR), so Checkout derives the currency from it — no session
      // `currency` override needed.
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/dashboard/billing?success=1`,
      cancel_url: `${appUrl()}/dashboard/billing?canceled=1`,
      ...(referralContext && coupon ? { discounts: [{ coupon }] } : {}),
      subscription_data: { metadata: { org_id: orgId, plan, currency } },
      metadata: { org_id: orgId, plan, currency, ...(referralContext ? { referral_context: referralContext } : {}) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Common causes: priceId is from a different mode (test vs live) than
    // the configured STRIPE_SECRET_KEY, or the stored customer id was
    // created under a different key/mode.
    console.error("Stripe checkout session failed", err);
    const message = err instanceof Error ? err.message : "Couldn't start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
