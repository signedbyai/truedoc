import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, consoleMeteredPriceIdFor } from "@/lib/stripe";
import { sendConsoleCapWarningEmail } from "@/lib/email";

// Pricing constants (CONSOLE_AI_SIGNING_SCOPE.md, CONSOLE_UX_SCOPE.md) — the
// same free-sends/month + $0.25/doc figures already shown on
// console/page.tsx, centralized here so the cap math, the usage panel, and
// the pitch page never drift apart. Deliberately USD-denominated for the
// cap/bill-so-far math regardless of the org's actual Stripe billing
// currency (EUR/GBP/CHF) — the cap is a local safety guardrail and display
// figure, not itself a Stripe-billed amount (the real invoice still uses
// the org's correct currency Price, via consoleMeteredPriceIdFor). Good
// enough for a v1 spend cap; a future pass could localize the cap's own
// currency if that mismatch ever confuses a non-USD org.
//
// Raised from 20 to 50 (2026-08-02, API_TIER_SCOPE.md, direct instruction)
// as part of unlocking Pro/Team access to the plain REST API + webhooks —
// stays metered rather than becoming unlimited (Console's bulk-send has no
// volume cap of its own, see console-bulk-send-cap-removed memory), so a
// more generous free allowance is the actual lever being pulled here. Every
// hardcoded "20 free" mention in marketing/settings copy (developers,
// console, dashboard/settings, verified-badge pages) needs to match this.
export const CONSOLE_FREE_ALLOWANCE = 50;
export const CONSOLE_OVERAGE_CENTS = 25;

// 80% of the cap is the warning threshold (CONSOLE_UX_SCOPE.md's "Decided"
// section) — fires once per billing period via console_cap_warning_sent_at.
const CONSOLE_CAP_WARNING_THRESHOLD = 0.8;

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

    const newCount = (org?.console_usage_current_period ?? 0) + 1;
    await admin
      .from("organizations")
      .update({
        console_usage_current_period: newCount,
        console_first_used_at: org?.console_first_used_at ?? new Date().toISOString(),
      })
      .eq("id", orgId);

    // Fire the 80%-of-cap warning at most once per billing period — never
    // blocks the send this is attached to (see the outer fire-and-forget
    // caller), and never throws past this try/catch.
    void maybeSendConsoleCapWarning(orgId, newCount);
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

export type ConsoleBillingState = {
  unitsUsed: number;
  freeAllowance: number;
  billableUnits: number;
  billCents: number;
  capEnabled: boolean;
  capCents: number;
  capReached: boolean;
  warningThresholdReached: boolean;
};

/** Pure calculation, split out so it's unit-testable without a DB round
 *  trip — same "extract the pure part" precedent as org.ts's
 *  resolveActiveOrgId. */
export function computeConsoleBillingState(input: {
  unitsUsed: number;
  capEnabled: boolean;
  capCents: number;
}): ConsoleBillingState {
  const billableUnits = Math.max(0, input.unitsUsed - CONSOLE_FREE_ALLOWANCE);
  const billCents = billableUnits * CONSOLE_OVERAGE_CENTS;
  return {
    unitsUsed: input.unitsUsed,
    freeAllowance: CONSOLE_FREE_ALLOWANCE,
    billableUnits,
    billCents,
    capEnabled: input.capEnabled,
    capCents: input.capCents,
    capReached: input.capEnabled && billCents >= input.capCents,
    warningThresholdReached: input.capEnabled && billCents >= input.capCents * CONSOLE_CAP_WARNING_THRESHOLD,
  };
}

/** Reads the org's current metered usage/cap and returns the computed
 *  billing state — the single source both the /dashboard/console panel
 *  and the pre-send cap check read from. Always reads the local counter,
 *  never Stripe (see recordConsoleUsage's comment on why: Stripe's meter
 *  aggregation isn't real-time). */
export async function getConsoleBillingState(orgId: string): Promise<ConsoleBillingState> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("console_usage_current_period, console_spend_cap_enabled, console_spend_cap_cents")
    .eq("id", orgId)
    .single();

  return computeConsoleBillingState({
    unitsUsed: org?.console_usage_current_period ?? 0,
    capEnabled: org?.console_spend_cap_enabled ?? true,
    capCents: org?.console_spend_cap_cents ?? 2500,
  });
}

/** Pre-send guard for metered console actions (chat, bulk-send, the public
 *  API) — call BEFORE the send happens, unlike recordConsoleUsage (which
 *  is fire-and-forget, called after). Business/unmetered orgs should never
 *  call this at all; callers gate on the `metered` flag first. */
export async function checkConsoleCap(orgId: string): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const state = await getConsoleBillingState(orgId);
  if (state.capReached) {
    return {
      allowed: false,
      reason: `Console spend cap reached ($${(state.capCents / 100).toFixed(2)} this period). Raise or turn off the cap in the console to keep sending.`,
    };
  }
  return { allowed: true };
}

/** Fires the 80%-of-cap warning email at most once per billing period.
 *  Called from recordConsoleUsage right after the counter increments —
 *  `newCount` is passed in rather than re-read, so this reflects the send
 *  that just happened rather than a stale read. Never throws past its own
 *  try/catch; a failed warning email should never affect anything else. */
async function maybeSendConsoleCapWarning(orgId: string, newCount: number): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("name, owner_id, console_spend_cap_enabled, console_spend_cap_cents, console_cap_warning_sent_at")
      .eq("id", orgId)
      .single();
    if (!org || !org.console_spend_cap_enabled || org.console_cap_warning_sent_at) return;

    const state = computeConsoleBillingState({
      unitsUsed: newCount,
      capEnabled: org.console_spend_cap_enabled,
      capCents: org.console_spend_cap_cents,
    });
    if (!state.warningThresholdReached) return;

    const { data: ownerData } = await admin.auth.admin.getUserById(org.owner_id);
    const ownerEmail = ownerData?.user?.email;
    if (!ownerEmail) return;

    await sendConsoleCapWarningEmail({
      to: ownerEmail,
      orgName: org.name,
      billCents: state.billCents,
      capCents: state.capCents,
    });

    await admin
      .from("organizations")
      .update({ console_cap_warning_sent_at: new Date().toISOString() })
      .eq("id", orgId);
  } catch (err) {
    console.error("Console cap warning email failed", { orgId, err });
  }
}

/** Resets the per-period counter and warning flag — called from the
 *  invoice.payment_succeeded webhook handler at each new billing cycle.
 *  console_cap_intro_seen_at is deliberately NOT touched here (lifetime
 *  flag, not per-period — see migration 0040). */
export async function resetConsolePeriod(orgId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("organizations")
    .update({ console_usage_current_period: 0, console_cap_warning_sent_at: null })
    .eq("id", orgId);
}
