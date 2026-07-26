"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type FrequentSigner = { id: string; name: string; email: string; isSelf: boolean };

// Org-wide saved contacts (Settings > Frequent signers), phase 1 of the
// backlog item -- see product_backlog.md. Consumed by the optional "who's
// this for?" picker on the AI Drafter and Magic Quote drafting flows
// (ai-draft-form.tsx / magic-quote-form.tsx). Self-contained client
// component, fetching its own list on mount rather than taking it as a
// server prop -- the list can change from other tabs/sessions and this
// settings card is the only place that reads it, so there's no shared
// server-render benefit to threading it through settings/page.tsx.
//
// The first entry is always the signed-in user's own name/email, seeded
// automatically server-side the first time the list is fetched (the
// cold-start fix -- a brand-new list is never empty). It's shown with a
// muted "(you)" tag instead of a Remove button.
export function FrequentSignersSettings() {
  const [signers, setSigners] = useState<FrequentSigner[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Non-blocking — the contact is already saved by the time this shows.
  // Worth flagging here more than most places: a typo saved as a frequent
  // signer gets reused across every future document, not just one send.
  // See BOUNCE_TRACKING_SCOPE.md.
  const [domainWarning, setDomainWarning] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/frequent-signers");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load frequent signers.");
        if (!cancelled) setSigners(data.signers);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Something went wrong.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addSigner() {
    if (!name.trim() || !email.trim()) return;
    setAdding(true);
    setAddError("");
    setDomainWarning("");
    try {
      const res = await fetch("/api/frequent-signers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that contact.");
      setSigners((prev) => [...(prev ?? []), data.signer]);
      setDomainWarning(typeof data.domainWarning === "string" ? data.domainWarning : "");
      setName("");
      setEmail("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function removeSigner(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/frequent-signers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't remove that contact.");
      }
      setSigners((prev) => (prev ?? []).filter((s) => s.id !== id));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRemovingId(null);
    }
  }

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;

  return (
    <div>
      {signers === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {signers.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {s.name} {s.isSelf && <span className="font-normal text-slate-400">(you)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{s.email}</p>
              </div>
              {s.isSelf ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  Added automatically
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => removeSigner(s.id)}
                  disabled={removingId === s.id}
                  className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                >
                  {removingId === s.id ? "Removing…" : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="h-9 min-w-[8rem] flex-1 rounded-md border border-slate-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        />
        <div className="relative min-w-[10rem] flex-1">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
          {/* Floating dismissible popover, same shape as the referral gift
              button's popover (referral-gift-button.tsx) — anchored under the
              field it's about, not a full-page modal, since the contact is
              already saved by the time this shows. */}
          {domainWarning && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setDomainWarning("")}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Double-check this address</p>
                  <button
                    type="button"
                    onClick={() => setDomainWarning("")}
                    aria-label="Close"
                    className="-mr-1 -mt-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">{domainWarning}</p>
              </div>
            </>
          )}
        </div>
        <Button size="sm" disabled={adding || !name.trim() || !email.trim()} onClick={addSigner}>
          {adding ? "Adding…" : "Add"}
        </Button>
      </div>
      {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
    </div>
  );
}
