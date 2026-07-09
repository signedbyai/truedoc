import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { getStripe, PLAN_PRICE_IDS, appUrl, type PlanId } from "@/lib/stripe";

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
  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "That plan isn't configured yet." }, { status: 500 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, stripe_customer_id")
    .eq("id", orgId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const stripe = getStripe();
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
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/dashboard/billing?success=1`,
    cancel_url: `${appUrl()}/dashboard/billing?canceled=1`,
    subscription_data: { metadata: { org_id: orgId, plan } },
    metadata: { org_id: orgId, plan },
  });

  return NextResponse.json({ url: session.url });
}
