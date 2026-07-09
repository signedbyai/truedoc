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

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${appUrl()}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
