"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Provider = "anthropic" | "mistral" | "deepseek";

const OPTIONS: { id: Provider; label: string; description: string }[] = [
  {
    id: "mistral",
    label: "Mistral",
    description: "Default. Powers field suggestions, document drafting, and summaries/translation.",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    description: "An alternative provider for the same features, for anyone who'd rather use Anthropic instead.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "Another alternative provider for the same features, for anyone who'd rather use DeepSeek instead.",
  },
];

// Org-wide preference for which AI provider handles field suggestions,
// document drafting, and summaries/translation — see
// src/app/api/org/ai-provider/route.ts and src/lib/ai-provider.ts. All
// three providers use a key configured on the server (not something typed
// in here) — this only picks which one your organization's requests go to.
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
