import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PricingCards } from "@/components/pricing-cards";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan: "free" | "starter" | "team" | "business" | null = null;
  if (user) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organizations(plan)")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    const org = membership?.organizations as unknown as { plan?: string } | { plan?: string }[] | undefined;
    const plan = Array.isArray(org) ? org[0]?.plan : org?.plan;
    currentPlan = (plan as "free" | "starter" | "team" | "business" | undefined) ?? "free";
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            ← SignedBy
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Simple pricing</h1>
          <p className="mt-2 text-sm text-slate-600">No per-seat tax. Cancel anytime.</p>
        </div>

        <PricingCards isLoggedIn={Boolean(user)} currentPlan={currentPlan} />
      </div>
    </main>
  );
}
