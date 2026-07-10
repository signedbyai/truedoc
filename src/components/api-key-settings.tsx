"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ApiKeySettings({ apiKeyPrefix }: { apiKeyPrefix: string | null }) {
  const router = useRouter();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function generate() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/org/api-key", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't generate a key.");
      setNewKey(data.apiKey);
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function revoke() {
    setStatus("loading");
    setError("");
    try {
      await fetch("/api/org/api-key", { method: "DELETE" });
      setNewKey(null);
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-3">
      {newKey ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-900">
            Copy this key now — you won&apos;t be able to see it again.
          </p>
          <code className="mt-1 block break-all rounded bg-white px-2 py-1.5 text-xs text-slate-800">{newKey}</code>
        </div>
      ) : apiKeyPrefix ? (
        <p className="text-sm text-slate-600">
          Active key: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{apiKeyPrefix}…</code>
        </p>
      ) : (
        <p className="text-sm text-slate-500">No API key yet.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={generate} disabled={status === "loading"}>
          {apiKeyPrefix ? "Regenerate key" : "Generate key"}
        </Button>
        {apiKeyPrefix && (
          <button
            onClick={revoke}
            disabled={status === "loading"}
            className="text-sm font-medium text-slate-500 hover:text-red-600"
          >
            Revoke
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Regenerating invalidates the previous key immediately. See docs below for usage.
      </p>
    </div>
  );
}
