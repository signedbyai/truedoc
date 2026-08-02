import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { referralCouponId } from "@/lib/referral";
import { sendPlanUpgradeEmail } from "@/lib/email";
import { resetConsolePeriod } from "@/lib/console-usage";
import { planHasFeature } from "@/lib/plan";
import { seedExampleTemplateIfNeeded } from "@/lib/example-template";

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

        // Credit pack purchase (CONSOLE_FREE_TIER_SCOPE.md item #8) — a
        // one-time payment, not a subscription, routed entirely separately
        // from the plan-sync logic below. Checked first since
        // session.mode === "payment" would otherwise just fall through the
        // subscription guard below and silently no-op.
        if (session.mode === "payment" && session.metadata?.type === "credit_pack") {
          await grantCreditPack(admin, session);
          break;
        }

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

        // Console usage-counter reset (CONSOLE_UX_SCOPE.md) — every
        // successful invoice marks a new billing period starting, so this
        // is where console_usage_current_period and the per-period cap-
        // warning flag reset. Harmless no-op for orgs that never used the
        // console (counter's already 0). Runs on every paid invoice, not
        // just console-specific ones, since any renewal is a new period.
        const { data: orgForReset } = await admin
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (orgForReset) await resetConsolePeriod(orgForReset.id);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = await resolveOrgId(admin, subscription);
        if (orgId) await syncSubscription(admin, orgId, subscription);
        break;
      }

      // Org-level Stripe Identity (VERIFIED_BADGE_SCOPE.md) — needs
      // "identity.verification_session.verified" enabled on this webhook
      // endpoint in the Stripe dashboard alongside the existing checkout/
      // subscription/invoice events. Retrieves the session with
      // verified_outputs expanded since the webhook payload's own
      // data.object doesn't include the confirmed name by default.
      case "identity.verification_session.verified": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        const orgId = session.metadata?.org_id;
        if (!orgId) break;

        const full = await stripe.identity.verificationSessions.retrieve(session.id, {
          expand: ["verified_outputs"],
        });
        const outputs = full.verified_outputs;
        const name = outputs ? [outputs.first_name, outputs.last_name].filter(Boolean).join(" ").trim() : "";

        await admin
          .from("organizations")
          .update({
            identity_verified_at: new Date().toISOString(),
            identity_verified_name: name || "Verified individual",
            stripe_identity_verification_session_id: session.id,
          })
          .eq("id", orgId);
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

// Grants a credit-pack purchase. Idempotent by construction: Stripe can (and
// does) redeliver checkout.session.completed, and the unique constraint on
// credit_purchases.stripe_checkout_session_id (0044_credit_packs.sql) means
// a redelivery's insert fails with a Postgres unique-violation (23505) —
// caught below and treated as "already processed," not an error. Only a
// delivery whose insert actually succeeds goes on to credit the balance, so
// a duplicate webhook can never double-credit an org even under concurrent
// delivery (the unique constraint is enforced by Postgres itself, not by
// this code checking-then-writing).
async function grantCreditPack(admin: ReturnType<typeof createAdminClient>, session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.org_id;
  const credits = Number(session.metadata?.credits);
  if (!orgId || !Number.isFinite(credits) || credits <= 0) {
    console.error("Credit pack webhook missing/invalid metadata", session.id, session.metadata);
    return;
  }

  const { error: insertError } = await admin.from("credit_purchases").insert({
    org_id: orgId,
    stripe_checkout_session_id: session.id,
    credits,
    amount_cents: session.amount_total ?? 0,
  });
  if (insertError) {
    if (insertError.code === "23505") return; // already processed — duplicate webhook delivery
    console.error("Credit pack purchase log failed", insertError);
    throw insertError;
  }

  const { data: org } = await admin.from("organizations").select("doc_credits").eq("id", orgId).single();
  await admin
    .from("organizations")
    .update({ doc_credits: (org?.doc_credits ?? 0) + credits })
    .eq("id", orgId);
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

  // Example template seed (2026-07-31, direct instruction) — so a newly
  // Pro-or-higher org has something ready to send/sign immediately rather
  // than an empty Templates list. Fire-and-forget: seedExampleTemplateIfNeeded
  // never throws (see example-template.ts) and its own existence check
  // makes this safe to call on every subscription sync, not just the first
  // one — a Pro org later moving to Team just no-ops here instead of
  // getting a second copy.
  if (isActive && planHasFeature(plan, "templates")) void seedExampleTemplateIfNeeded(orgId);
}
