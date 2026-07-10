import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { getStripe, appUrl } from "@/lib/stripe";

export async function POST() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — subscribe to a plan first." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl()}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Common causes: the Customer Portal hasn't been activated for this
    // Stripe account/mode yet (Settings -> Billing -> Customer portal), or
    // the stored customer id was created under a different API key/mode
    // than the one currently configured.
    console.error("Stripe billing portal session failed", err);
    const message = err instanceof Error ? err.message : "Couldn't open the billing portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
