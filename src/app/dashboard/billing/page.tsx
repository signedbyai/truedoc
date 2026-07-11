import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingCards } from "@/components/pricing-cards";
import { ManageBillingButton } from "@/components/manage-billing-button";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  team: "Team",
  business: "Business",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success, canceled } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organizations(id, plan, stripe_customer_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const orgRaw = membership?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as
    | { id: string; plan: string; stripe_customer_id: string | null }
    | undefined;

  const currentPlan = (org?.plan as "free" | "starter" | "team" | "business" | undefined) ?? "free";

  let subscription: { status: string; current_period_end: string | null } | null = null;
  if (org?.id) {
    const { data } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("org_id", org.id)
      .maybeSingle();
    subscription = data;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Billing</h1>
        </div>

        {success && (
          <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            Subscription updated — thanks for upgrading!
          </p>
        )}
        {canceled && (
          <p className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-600">Checkout canceled — no changes made.</p>
        )}

        <Card>
          <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Current plan: {PLAN_LABEL[currentPlan] ?? currentPlan}</CardTitle>
              <CardDescription>
                {subscription?.current_period_end
                  ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : currentPlan === "free"
                    ? "Upgrade anytime — no card required until you do."
                    : "Managed via Stripe."}
              </CardDescription>
            </div>
            {org?.stripe_customer_id && <ManageBillingButton />}
          </CardHeader>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-medium text-slate-700">Change plan</h2>
          <PricingCards isLoggedIn currentPlan={currentPlan} />
        </div>
      </div>
    </main>
  );
}
