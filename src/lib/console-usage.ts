import { createAdminClient } from "@/lib/supabase/admin";

// Console AI signing-ops product (CONSOLE_AI_SIGNING_SCOPE.md) — metered
// usage tracking for Pro/Team orgs calling POST /api/v1/documents without a
// Business plan (see src/lib/api-auth.ts's `metered` flag).
//
// Deliberately NOT calling Stripe's usage-record API yet. That call needs
// two things this codebase doesn't have an answer for without a live test
// against Stripe: (1) which currency the metered subscription item should
// be created in — organizations doesn't store a billing currency today
// (see src/lib/stripe.ts's per-currency price tables, which are selected
// from a request-time cookie/geo, not a stored org field), and a
// subscription's line items must share one currency; and (2) confirming
// `subscriptionItems.createUsageRecord` behaves as expected against a
// metered Price attached to an org's *existing* Pro/Team subscription
// (rather than a separate subscription), which is the cheaper-to-run
// shape but needs verifying in Stripe's dashboard/test mode first.
//
// Until that's resolved (with Michael, in Stripe test mode) this function
// only tracks a running count for the console dashboard — real billing
// still needs the Stripe half built. Called fire-and-forget from the
// document-create route so a tracking hiccup never blocks a real send.
export async function recordConsoleUsage(orgId: string): Promise<void> {
  try {
    const admin = createAdminClient();
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

    // TODO(console billing): once a metered Stripe Price exists per
    // currency and the currency question above is resolved, report real
    // usage here, e.g.:
    //   const itemId = await ensureConsoleSubscriptionItem(orgId);
    //   await getStripe().subscriptionItems.createUsageRecord(itemId, {
    //     quantity: 1,
    //     action: "increment",
    //   });
  } catch (err) {
    // Never block a real document send over a usage-tracking failure.
    console.error("Console usage tracking failed", { orgId, err });
  }
}
