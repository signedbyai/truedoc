"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type FrequentSigner = { id: string; name: string; email: string; isSelf: boolean };

// Optional "who's this for?" chip picker for the AI Drafter and Magic Quote
// review steps (ai-draft-form.tsx / magic-quote-form.tsx) -- phase 1 of the
// frequent-signers backlog item (see product_backlog.md). Picking a contact
// here pre-fills them as the document's first recipient once it's created
// (see field-editor.tsx's initialSignerName/initialSignerEmail seeding
// effect); picking nothing leaves the flow exactly as it was before this
// feature existed.
//
// Deliberately excludes the auto-seeded self entry (frequent-signers.ts) --
// "who's this for" is asking about the other party, not the sender, and
// showing "you" as a pickable option here would be confusing. Renders
// nothing at all while loading or if the org has no non-self contacts yet
// (nothing worth showing rather than an empty state nobody asked for).
export function FrequentSignerPicker({
  value,
  onChange,
}: {
  value: FrequentSigner | null;
  onChange: (signer: FrequentSigner | null) => void;
}) {
  const [signers, setSigners] = useState<FrequentSigner[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/frequent-signers")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.signers)) setSigners(data.signers);
      })
      .catch(() => {
        if (!cancelled) setSigners([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pickable = (signers ?? []).filter((s) => !s.isSelf);
  if (pickable.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-700">
        Who&rsquo;s this for? <span className="font-normal text-slate-400">(optional)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {pickable.map((s) => {
          const selected = value?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(selected ? null : s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                selected
                  ? "border-violet-600 bg-violet-50 font-medium text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
