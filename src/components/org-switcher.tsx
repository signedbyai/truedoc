"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SwitcherOrg = { id: string; name: string; plan: string };

// Renders nothing for the common case (a user who belongs to exactly one
// org) — no point showing a switcher with a single, un-switchable option.
// See src/lib/org.ts's getUserAndOrg() for how "active org" is resolved
// and persisted (Supabase Auth user_metadata, not a cookie — cross-device,
// no migration).
export function OrgSwitcher({ orgs, activeOrgId }: { orgs: SwitcherOrg[]; activeOrgId: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(activeOrgId);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  if (orgs.length <= 1) return null;

  async function handleChange(nextOrgId: string) {
    if (nextOrgId === current) return;
    const previous = current;
    setCurrent(nextOrgId);
    setSwitching(true);
    setError("");
    try {
      const res = await fetch("/api/org/switch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: nextOrgId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't switch organizations.");
      // Every dashboard page derives its data from the active org server-
      // side, so a refresh (not just local state) is what actually shows
      // the new org's documents/team/settings/etc.
      router.refresh();
    } catch (err) {
      setCurrent(previous); // revert the optimistic switch
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="Active organization"
        value={current}
        disabled={switching}
        onChange={(e) => handleChange(e.target.value)}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
