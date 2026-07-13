import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingCards } from "@/components/pricing-cards";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { PLAN_LABEL } from "@/lib/plan";
import { OrgSwitcher } from "@/components/org-switcher";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success, canceled } = await searchParams;
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { supabase, orgId, orgs } = ctx;

  // getUserAndOrg()'s orgs list only carries id/name/plan (enough for the
  // switcher) — billing needs stripe_customer_id too, so this fetches that
  // one extra column for the active org specifically, same pattern as
  // team/page.tsx and settings/page.tsx fetching their own extra columns.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, plan, stripe_customer_id")
    .eq("id", orgId)
    .single();

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Billing</h1>
          </div>
          <OrgSwitcher orgs={orgs} activeOrgId={orgId} />
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
