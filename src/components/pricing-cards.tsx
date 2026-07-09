"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlanId = "starter" | "team" | "business";

const PLANS: {
  id: "free" | PlanId;
  name: string;
  price: string;
  blurb: string;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    blurb: "For trying SignedBy out",
    features: ["3 documents/mo", "1 user", "SignedBy branding on signing page"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$7/mo",
    blurb: "For solo professionals",
    features: ["Unlimited documents", "1 user", "Templates & reminders"],
  },
  {
    id: "team",
    name: "Team",
    price: "$14/mo",
    blurb: "For small teams",
    features: ["Everything in Starter", "Shared templates", "Bulk send", "Basic branding"],
  },
  {
    id: "business",
    name: "Business",
    price: "$29/mo",
    blurb: "Up to 5 users",
    features: ["Everything in Team", "API access", "Custom branding", "Payment collection"],
  },
];

export function PricingCards({
  isLoggedIn,
  currentPlan,
}: {
  isLoggedIn: boolean;
  currentPlan: "free" | PlanId | null;
}) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

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
                <p className="text-2xl font-bold text-slate-900">{p.price}</p>
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
                      <Link href="/login" className="block">
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
                    <Link href="/login" className="block">
                      <Button className="w-full">Sign in to subscribe</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
