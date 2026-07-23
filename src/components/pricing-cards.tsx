"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { cn } from "@/lib/utils";
import { CURRENCY_COOKIE, formatPrice, otherCurrencies, type Currency, type PlanKey } from "@/lib/currency";
import type { CtaColor } from "@/flags";

type PlanId = "starter" | "team" | "business";

const PLANS: {
  id: PlanKey;
  name: string;
  blurb: string;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    blurb: "For trying SignedBy out",
    features: ["3 documents/mo", "1 user", "SignedBy branding on signing page"],
  },
  {
    id: "starter",
    name: "Starter",
    blurb: "For solo professionals",
    features: ["Unlimited documents", "1 user", "Templates & reminders", "AI-drafted documents", "Engagement tracking"],
  },
  {
    id: "team",
    name: "Team",
    blurb: "Up to 3 users",
    features: ["Everything in Starter", "Shared templates", "Bulk send", "Custom branding (logo & color)"],
  },
  {
    id: "business",
    name: "Business",
    blurb: "Up to 5 users",
    features: ["Everything in Team", "API access", "Payment collection", "Gated file delivery"],
  },
];

export function PricingCards({
  isLoggedIn,
  currentPlan,
  initialCurrency,
  // Optional, defaulting to "yellow": the "Sign in to subscribe" CTA only
  // renders when isLoggedIn is false, which is only reachable from the
  // public /pricing page (see src/app/pricing/page.tsx, which passes the
  // real flag value). dashboard/billing/page.tsx always renders this with
  // isLoggedIn hardcoded true, so that branch -- and this prop -- doesn't
  // apply there; no need to thread the flag through an authenticated
  // dashboard page just to satisfy the type.
  ctaColor = "yellow",
}: {
  isLoggedIn: boolean;
  currentPlan: "free" | PlanId | null;
  initialCurrency: Currency;
  ctaColor?: CtaColor;
}) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState("");
  // Seeded from the server's geo/cookie resolution so the first paint already
  // matches the visitor. The toggle updates local state for an instant price
  // swap AND writes the cookie, so checkout (which re-reads it server-side)
  // charges whatever's shown.
  const [currency, setCurrency] = useState<Currency>(initialCurrency);

  function chooseCurrency(next: Currency) {
    setCurrency(next);
    // 1 year; path=/ so it applies to the checkout route too.
    // eslint-disable-next-line react-hooks/immutability -- intentional write to the browser cookie store from an event handler
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  async function subscribe(plan: PlanId) {
    setError("");
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout — try again.");
      }
      // eslint-disable-next-line react-hooks/immutability -- redirecting the browser on successful checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingPlan(null);
    }
  }

  const alternatives = otherCurrencies(currency);

  return (
    <div>
      {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <Card key={p.id} className={cn("flex h-full flex-col", isCurrent && "border-slate-900")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {p.name}
                  {isCurrent && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      Current
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-2xl font-bold text-slate-900">{formatPrice(currency, p.id, { withPeriod: true })}</p>
                <p className="mt-1 text-xs text-slate-500">{p.blurb}</p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                  {p.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>

                <div className="mt-auto pt-5">
                  {p.id === "free" ? (
                    isLoggedIn ? (
                      <Button variant="outline" className="w-full" disabled>
                        {isCurrent ? "Current plan" : "Included"}
                      </Button>
                    ) : (
                      <Link href="/login?intent=signup" className="block">
                        <Button variant="outline" className="w-full">
                          Get started
                        </Button>
                      </Link>
                    )
                  ) : isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : isLoggedIn ? (
                    <Button className="w-full" onClick={() => subscribe(p.id as PlanId)} disabled={loadingPlan !== null}>
                      {loadingPlan === p.id ? "Redirecting…" : "Subscribe"}
                    </Button>
                  ) : (
                    <CtaLink
                      href="/login?intent=signup"
                      size="default"
                      className="w-full"
                      color={ctaColor}
                      page="pricing"
                      position="subscribe"
                    >
                      Sign in to subscribe
                    </CtaLink>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quiet correction control — its real job is fixing wrong geo / VPN,
          not currency shopping, so it sits below the cards and reads as
          "you're seeing X, switch if that's wrong" rather than a prominent
          side-by-side comparison (which invites gaming the parity FX gap). */}
      <p className="mt-8 text-center text-xs text-slate-400">
        Prices shown in {currency}. View in{" "}
        {alternatives.map((c, i) => (
          <span key={c}>
            {i > 0 && " · "}
            <button
              type="button"
              onClick={() => chooseCurrency(c)}
              className="underline underline-offset-2 hover:text-slate-600"
            >
              {c}
            </button>
          </span>
        ))}
      </p>
    </div>
  );
}
