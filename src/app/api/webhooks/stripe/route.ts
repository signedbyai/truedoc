import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { referralCouponId } from "@/lib/referral";
import { sendPlanUpgradeEmail } from "@/lib/email";

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

        // Referral coupon bookkeeping — only on real completion, so an
        // abandoned checkout never burns the discount (see the checkout route).
        const referralContext = session.metadata?.referral_context;
        if (referralContext === "welcome") {
          await admin
            .from("referrals")
            .update({ referred_discount_applied: true })
            .eq("referred_org_id", orgId);
        } else if (referralContext === "reward") {
          await admin.from("organizations").update({ pending_referral_reward: false }).eq("id", orgId);
        }

        // Plan-upgrade confirmation + Trustpilot AFS trigger (see
        // sendPlanUpgradeEmail) — only on this brand-new-checkout event,
        // never on renewals. Best-effort: a failed send here shouldn't fail
        // the whole webhook, since the subscription itself is already
        // synced above regardless.
        try {
          const customerEmail = session.customer_details?.email;
          const plan = planFromPriceId(subscription.items.data[0]?.price?.id);
          if (customerEmail && plan) {
            await sendPlanUpgradeEmail({
              to: customerEmail,
              planLabel: plan.charAt(0).toUpperCase() + plan.slice(1),
            });
          }
        } catch (err) {
          console.error("Failed to send plan upgrade email", err);
        }
        break;
      }

      // The referred org's first REAL (non-zero) payment is what unlocks the
      // referrer's reward — the abuse guard. Fires for the initial paid invoice
      // when there's no welcome discount, or for the first renewal after a free
      // month. Needs the "invoice.payment_succeeded" event enabled on the
      // Stripe webhook (added alongside the referral feature).
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice.amount_paid ?? 0) <= 0) break;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        await rewardReferrerOnFirstPayment(admin, stripe, customerId);
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

// Grant the referrer their "get a month" once the org they referred makes a
// real payment. Idempotent by construction: only a still-'pending' referral is
// acted on, so repeat invoices no-op. If the referrer already pays for a plan,
// the coupon is applied to their live subscription now; if they're still on
// free, we stash pending_referral_reward and redeem it at their next checkout.
async function rewardReferrerOnFirstPayment(
  admin: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  referredCustomerId: string
) {
  const { data: referredOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", referredCustomerId)
    .single();
  if (!referredOrg) return;

  const { data: referral } = await admin
    .from("referrals")
    .select("id, referrer_org_id, status")
    .eq("referred_org_id", referredOrg.id)
    .single();
  if (!referral || referral.status !== "pending") return;

  await admin
    .from("referrals")
    .update({ status: "qualified", qualified_at: new Date().toISOString() })
    .eq("id", referral.id);

  const coupon = referralCouponId();
  if (!coupon) return; // nothing to grant without a configured coupon; leave it 'qualified'

  const { data: referrer } = await admin
    .from("organizations")
    .select("id, stripe_subscription_id")
    .eq("id", referral.referrer_org_id)
    .single();
  if (!referrer) return;

  if (referrer.stripe_subscription_id) {
    // Referrer is already paying — discount their live subscription now.
    try {
      await stripe.subscriptions.update(referrer.stripe_subscription_id, { discounts: [{ coupon }] });
    } catch (err) {
      console.error("Failed to apply referral reward coupon to referrer subscription", err);
      return; // stays 'qualified' so it can be retried/handled, not silently lost
    }
  } else {
    // Referrer is on free — redeem the free month at their next checkout.
    await admin.from("organizations").update({ pending_referral_reward: true }).eq("id", referrer.id);
  }

  await admin
    .from("referrals")
    .update({ status: "rewarded", rewarded_at: new Date().toISOString() })
    .eq("id", referral.id);
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
