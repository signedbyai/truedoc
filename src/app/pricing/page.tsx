import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import { getUserAndOrg } from "@/lib/org";
import { PricingCards } from "@/components/pricing-cards";
import Image from "next/image";
import { getRequestCurrency } from "@/lib/currency.server";
import { ctaColorFlag } from "@/flags";

const TITLE = "Pricing — SignedBy";
const DESCRIPTION = "Flat $7/mo unlimited plan. No per-seat pricing. 3 free documents every month, no credit card required.";

// No metadata.openGraph/twitter override here, so this page still inherits
// the root layout's opengraph-image.tsx automatically -- see the comment in
// src/app/vs/signnow/page.tsx for the gotcha this sidesteps.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  // Not gated behind login (this page is public) — getUserAndOrg() just
  // returns null for a signed-out visitor, same as it always has.
  const ctx = await getUserAndOrg();
  const currency = await getRequestCurrency();
  const ctaColor = await ctaColorFlag();

  let currentPlan: "free" | "starter" | "team" | "business" | null = null;
  if (ctx) {
    const org = ctx.orgs.find((o) => o.id === ctx.orgId);
    currentPlan = (org?.plan as "free" | "starter" | "team" | "business" | undefined) ?? "free";
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:opacity-80">
            <span aria-hidden className="text-sm font-medium">←</span>
            <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Simple pricing</h1>
          <p className="mt-2 text-sm text-slate-600">No per-seat tax. Cancel anytime.</p>
        </div>

        <PricingCards isLoggedIn={Boolean(ctx)} currentPlan={currentPlan} initialCurrency={currency} ctaColor={ctaColor} />

        <p className="mt-8 text-center text-sm text-slate-500">
          Business also includes a full REST API and outbound webhooks —{" "}
          <Link href="/developers" className="font-medium text-slate-700 underline hover:text-slate-900">
            see the API docs
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
