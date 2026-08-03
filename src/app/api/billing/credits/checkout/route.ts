import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { getStripe, appUrl, creditPackPriceFor, CREDIT_PACK_CREDITS } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestCurrency } from "@/lib/currency.server";
import { normalizeCurrency, type Currency } from "@/lib/currency";
import { consoleUrl } from "@/lib/console-host";

// `source` (2026-08-01, direct bug report: buying credits from Console's
// capReached bubble sent someone all the way back to signedby.ai after
// Stripe Checkout — its back arrow always uses the Checkout Session's
// `cancel_url`, which was hardcoded to /dashboard/billing on the main
// domain regardless of where the purchase started, a real cross-subdomain
// "exit console" for the one caller that actually lives on
// console.signedby.ai). A small closed enum, not an open "next" path —
// there are only two real callers of this route (console-chat.tsx,
// new-document-client.tsx), and the server picks the actual return URL
// from a hardcoded pair below rather than trusting anything client-
// supplied, so this can't become an open-redirect vector the way a raw
// URL/path param would need sanitizing against.
const bodySchema = z.object({ source: z.enum(["console", "dashboard"]).optional() });

// Pay-as-you-go credit pack checkout (CONSOLE_FREE_TIER_SCOPE.md item #8,
// built 2026-08-03) — a one-time $5 purchase for 25 extra document seals,
// for a Free org that's hit its 3-doc/month cap and would rather top up
// than subscribe. Deliberately separate from /api/billing/checkout (which
// is subscription-mode only, plan-restricted to starter/team/business).
//
// Currency handling went from "reuses none of that route's currency
// machinery, flat USD price with no plan concept at all" to actually
// mirroring it 2026-08-01 (direct bug report: a Europe-based visitor was
// still charged flat USD) — same geo/cookie resolution via
// getRequestCurrency, same "an existing Stripe customer is pinned to one
// currency, that lock wins over a fresh geo guess" check, just against
// creditPackPriceFor's inline price_data instead of a pre-created Price
// object (see stripe.ts for why that's actually simpler here, not
// harder — no per-currency Price to create in the Stripe dashboard first).
//
export async function POST(request: Request) {
  // Lenient on purpose (unlike /api/billing/checkout's strict 400 on a bad
  // body) — a missing/malformed body here just means "don't know where
  // this came from," which safely falls back to the existing
  // /dashboard/billing behavior below rather than blocking checkout over
  // what's ultimately a return-URL nicety.
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  const source = parsed.success ? parsed.data.source : undefined;

  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  // Card-testing guard (2026-08-03, direct ask: "do I need business
  // verification" for this new one-time-payment surface). A real KYB check
  // wouldn't actually stop this — a stolen-card attempt doesn't care
  // whether the buying org looks legitimate — but an authenticated account
  // repeatedly starting Checkout sessions to probe cards is exactly what a
  // rate limit catches cheaply. Same helper/pattern as upload-url's
  // `upload:${orgId}` limit; 5/hour is generous for real top-up behavior
  // (nobody legitimately buys credit packs more than a couple times a day)
  // while meaningfully blunting a loop through one account. Org-keyed, not
  // IP-keyed — this route requires a real session, so rotating orgs is the
  // costlier move for an attacker, same reasoning as every other
  // org-scoped limit in this file's neighborhood.
  const checkoutOk = await checkRateLimit(`credit_pack_checkout:${orgId}`, 5, 3600);
  if (!checkoutOk) {
    return NextResponse.json({ error: "Too many checkout attempts. Try again in a bit." }, { status: 429 });
  }

  const { data: org } = await supabase.from("organizations").select("name, stripe_customer_id").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Same geo/cookie resolution the pricing pages and the subscription
  // checkout route use, so a Free org is charged the currency it was
  // shown rather than a flat USD default.
  const requestCurrency = await getRequestCurrency();

  const stripe = getStripe();

  try {
    let customerId = org.stripe_customer_id;
    // Same "an existing customer is pinned to one currency" check as
    // /api/billing/checkout — a Stripe customer that's already paid in one
    // currency (e.g. a past subscription, or an earlier credit pack) fails
    // outright if this session tries a different one.
    let lockedCurrency: Currency | null = null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
      await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
    } else {
      const existing = await stripe.customers.retrieve(customerId);
      if (!existing.deleted) lockedCurrency = normalizeCurrency(existing.currency);
    }

    const currency = lockedCurrency ?? requestCurrency;
    const { currency: priceCurrency, amountCents } = creditPackPriceFor(currency);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: priceCurrency.toLowerCase(),
            unit_amount: amountCents,
            product_data: {
              name: `SignedBy credit pack — ${CREDIT_PACK_CREDITS} document seals`,
              description: "One-time top-up, no subscription. Credits never expire.",
            },
          },
          quantity: 1,
        },
      ],
      // console.signedby.ai/app for the console caller (both the
      // completed-purchase landing spot AND, more importantly, what
      // Stripe Checkout's own back-arrow uses — see the bodySchema
      // comment above), the existing /dashboard/billing spot for
      // everyone else. The exact "return to wherever you actually came
      // from within the dashboard" refinement (CONSOLE_FREE_TIER_SCOPE.md's
      // 1a) is still a known, deferred gap for the non-console caller —
      // this only closes the console cross-subdomain case that was
      // actually reported.
      success_url: source === "console" ? `${consoleUrl("/app")}?credits=1` : `${appUrl()}/dashboard/billing?credits=1`,
      cancel_url:
        source === "console" ? `${consoleUrl("/app")}?credits_canceled=1` : `${appUrl()}/dashboard/billing?credits_canceled=1`,
      // metadata (not subscription_data — this is a one-time payment, no
      // subscription object exists) is what the webhook keys off of to
      // route this to grantCreditPack() instead of the plan-sync path.
      metadata: { org_id: orgId, type: "credit_pack", credits: String(CREDIT_PACK_CREDITS), currency: priceCurrency },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Credit pack checkout session failed", err);
    const message = err instanceof Error ? err.message : "Couldn't start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
