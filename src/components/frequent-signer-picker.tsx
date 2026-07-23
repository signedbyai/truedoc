"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type FrequentSigner = { id: string; name: string; email: string; isSelf: boolean };

// Optional "Recipient" chip picker for the AI Drafter and Magic Quote review
// steps (ai-draft-form.tsx / magic-quote-form.tsx) -- phase 1 of the
// frequent-signers backlog item (see product_backlog.md). Picking a contact
// here pre-fills them as the document's first recipient once it's created
// (see field-editor.tsx's initialSignerName/initialSignerEmail seeding
// effect); picking nothing leaves the flow exactly as it was before this
// feature existed.
//
// Labeled "Recipient," not "Who's this for?" (renamed 2026-07-23) -- that
// wording collided with the separate sender-identity-picker.tsx, which
// answers a genuinely different question ("who on our team is this
// document from"). This picker is only ever about the counterparty who'll
// receive and sign the document.
//
// Includes the auto-seeded self entry (frequent-signers.ts), tagged "(you)"
// -- self-signing (a sole proprietor signing their own agreement) is a real
// case, and excluding it meant the picker never had anything to show for an
// org that hadn't yet added a second contact in Settings, since the self
// entry is the only one every org is guaranteed to have (2026-07-23,
// corrected after Michael caught this in testing). Renders nothing only
// while the initial fetch is still in flight.
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

  if (!signers || signers.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-700">
        Recipient <span className="font-normal text-slate-400">(optional)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {signers.map((s) => {
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
              {s.isSelf && <span className="text-slate-400"> (you)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
