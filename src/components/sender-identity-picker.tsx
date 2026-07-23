"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type SenderIdentity = { id: string; name: string; email: string; isSelf: boolean };

// "Prepared by" team-member chip picker for the AI Drafter and Magic Quote
// review steps (2026-07-23) -- answers a genuinely different question than
// frequent-signer-picker.tsx's "Recipient" picker: not who this document is
// going TO, but which of your own team members it's coming FROM. The picked
// person's name is rendered as a visible line on the finished PDF (see
// text-to-pdf.ts / quote-to-pdf.ts).
//
// Pulls from the org's real team roster (GET /api/team/members), not
// frequent_signers -- frequent signers are external contacts you send
// documents to, not your own teammates, so it's a different data source
// entirely. Auto-selects the signed-in user the moment the roster loads
// (onChange fires with the self entry) so a solo sender never has to
// interact with it for the default to be correct; renders nothing at all
// for a solo org (or while loading), since there's no one else to pick and
// showing a single-chip picker with only "you" in it isn't a real choice.
export function SenderIdentityPicker({
  value,
  onChange,
  hasTeam,
}: {
  value: SenderIdentity | null;
  onChange: (identity: SenderIdentity | null) => void;
  // From the org's plan (planHasFeature(plan, "teamMembers")) -- skips the
  // fetch entirely for Free/Starter orgs, which can only ever have one
  // member anyway, rather than making a network call whose answer is
  // always "nothing to show."
  hasTeam: boolean;
}) {
  const [members, setMembers] = useState<SenderIdentity[] | null>(null);

  useEffect(() => {
    if (!hasTeam) return;
    let cancelled = false;
    fetch("/api/team/members")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data.members)) return;
        const list: SenderIdentity[] = data.members.map(
          (m: { id: string; name: string; email: string; isSelf: boolean }) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            isSelf: m.isSelf,
          })
        );
        setMembers(list);
        // Default to yourself the moment the roster is known -- see doc
        // comment above. This effect only ever runs once per mount (empty
        // dep besides the stable hasTeam flag), so there's no risk of this
        // clobbering a deliberate later pick.
        const self = list.find((m) => m.isSelf) ?? null;
        if (self) onChange(self);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTeam]);

  if (!hasTeam || !members || members.length <= 1) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-700">Prepared by</p>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const selected = value?.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                selected
                  ? "border-slate-900 bg-slate-900 font-medium text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {m.name}
              {m.isSelf && <span className={selected ? "text-slate-300" : "text-slate-400"}> (you)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
