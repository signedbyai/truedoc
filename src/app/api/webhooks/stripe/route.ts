import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, planFromPriceId } from "@/lib/stripe";

// Stripe webhooks arrive unauthenticated (verified by signature instead), so
// this route uses the service-role admin client throughout — same pattern as
// the signer-facing /api/sign/* routes.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const orgId = session.metadata?.org_id;
        if (!orgId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await syncSubscription(admin, orgId, subscription);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = await resolveOrgId(admin, subscription);
        if (orgId) await syncSubscription(admin, orgId, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = await resolveOrgId(admin, subscription);
        if (orgId) {
          await admin.from("organizations").update({ plan: "free", stripe_subscription_id: null }).eq("id", orgId);
          await admin
            .from("subscriptions")
            .upsert(
              { org_id: orgId, plan: "free", status: "canceled", stripe_subscription_id: subscription.id },
              { onConflict: "org_id" }
            );
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function resolveOrgId(admin: ReturnType<typeof createAdminClient>, subscription: Stripe.Subscription) {
  const metaOrgId = subscription.metadata?.org_id;
  if (metaOrgId) return metaOrgId;

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return org?.id ?? null;
}

async function syncSubscription(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = planFromPriceId(priceId) ?? "free";
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
    : null;

  await admin
    .from("organizations")
    .update({
      plan: isActive ? plan : "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
    })
    .eq("id", orgId);

  await admin.from("subscriptions").upsert(
    {
      org_id: orgId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: isActive ? plan : "free",
      status: subscription.status,
      current_period_end: currentPeriodEnd,
    },
    { onConflict: "org_id" }
  );
}
