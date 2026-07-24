"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type Provider = "anthropic" | "mistral";

const OPTIONS: { id: Provider; label: string; description: string }[] = [
  {
    id: "mistral",
    label: "Mistral",
    description: "Default. Powers field suggestions, document drafting, and summaries/translation. EU-hosted.",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    description: "An alternative provider for the same features, for anyone who'd rather use Claude instead.",
  },
];

// Org-wide preference for which AI provider handles field suggestions,
// document drafting, and summaries/translation — see
// src/app/api/org/ai-provider/route.ts and src/lib/ai-provider.ts. This is
// the Business-plan-gated version (Phase 2, 2026-07-24): the first version
// (commit 52618b0) let any org member toggle it with no plan gate at all;
// this one is only rendered when planHasFeature(org.plan, "aiAnthropicProvider")
// is true (see dashboard/settings/page.tsx), matching /privacy + /dpa's
// "an organization on the Business plan can instead choose Anthropic..."
// disclosure — showing the picker to a non-Business org would make that
// disclosure inaccurate for them.
export function AIProviderSettings({ initialProvider }: { initialProvider: Provider }) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function choose(next: Provider) {
    if (next === provider) return;
    const previous = provider;
    setProvider(next);
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/org/ai-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setProvider(previous); // revert the optimistic switch
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors",
              provider === opt.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
            )}
          >
            <input
              type="radio"
              name="ai-provider"
              checked={provider === opt.id}
              disabled={status === "loading"}
              onChange={() => choose(opt.id)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="font-medium text-slate-900">{opt.label}</span>
              <br />
              <span className="text-slate-500">{opt.description}</span>
            </span>
          </label>
        ))}
      </div>
      {status === "loading" && <p className="text-xs text-slate-500">Saving…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Locked state for orgs below Business — same shape as the Integration & API
// card's non-apiAccess branch in dashboard/settings/page.tsx (plain gate
// line, no dashed upgrade box, since the Plan & team card already routes
// people to billing).
export function AIProviderLocked() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Documents are processed with Mistral AI (EU-hosted). Switching to Anthropic (Claude) is available on the
        Business plan.
      </p>
      <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Upgrade to Business
      </Link>
    </div>
  );
}
