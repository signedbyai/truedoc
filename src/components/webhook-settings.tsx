"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type WebhookEndpoint = { id: string; label: string | null; url: string; secret: string; enabled: boolean };

// Business-tier outbound webhooks (CRM_MCP_READINESS_PHASE1_SCOPE.md, project
// root). Same add/list/enable-disable/remove CRUD shape as
// FrequentSignersSettings — one org-wide list, self-fetched on mount. Unlike
// the API key, a webhook secret is always shown/re-copyable (never a
// one-time reveal) since the org needs to keep referencing it whenever they
// reconfigure Make or another destination — see the scope doc's Part B.
export function WebhookSettings() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org/webhooks");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load webhooks.");
        if (!cancelled) setEndpoints(data.endpoints);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Something went wrong.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addEndpoint() {
    if (!url.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/org/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), label: label.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that endpoint.");
      setEndpoints((prev) => [...(prev ?? []), data.endpoint]);
      setUrl("");
      setLabel("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/org/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't update that endpoint.");
      }
      setEndpoints((prev) => (prev ?? []).map((e) => (e.id === id ? { ...e, enabled } : e)));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeEndpoint(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/org/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't remove that endpoint.");
      }
      setEndpoints((prev) => (prev ?? []).filter((e) => e.id !== id));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function copySecret(id: string, secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // Best-effort — the secret is still visible on screen to copy by hand.
    }
  }

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;

  return (
    <div>
      {endpoints === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : endpoints.length === 0 ? (
        <p className="text-sm text-slate-500">No webhook endpoints yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {endpoints.map((e) => (
            <li key={e.id} className="space-y-1.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{e.label || "Unlabeled endpoint"}</p>
                  <p className="truncate text-xs text-slate-500">{e.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(e.id, !e.enabled)}
                    disabled={busyId === e.id}
                    className={`text-xs font-medium ${e.enabled ? "text-slate-500 hover:text-slate-700" : "text-slate-400 hover:text-emerald-600"}`}
                  >
                    {e.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEndpoint(e.id)}
                    disabled={busyId === e.id}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="truncate rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">{e.secret}</code>
                <button
                  type="button"
                  onClick={() => copySecret(e.id, e.secret)}
                  className="shrink-0 text-[11px] font-medium text-slate-400 hover:text-slate-700"
                >
                  {copiedId === e.id ? "Copied" : "Copy secret"}
                </button>
                {!e.enabled && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    Disabled
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="h-9 min-w-[8rem] flex-1 rounded-md border border-slate-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hook.make.com/..."
          className="h-9 min-w-[12rem] flex-[2] rounded-md border border-slate-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        />
        <Button size="sm" disabled={adding || !url.trim()} onClick={addEndpoint}>
          {adding ? "Adding…" : "Add endpoint"}
        </Button>
      </div>
      {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Every enabled endpoint receives document.viewed, document.signed, document.completed, and document.declined
        events, signed with its own secret via the X-SignedBy-Signature header.
      </p>
    </div>
  );
}
