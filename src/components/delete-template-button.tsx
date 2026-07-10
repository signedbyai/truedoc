"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't delete this template.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-xs font-medium text-slate-400 hover:text-red-600">
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs">
      {error && <span className="text-red-600">{error}</span>}
      <button onClick={() => setConfirming(false)} disabled={loading} className="text-slate-400 hover:text-slate-600">
        Cancel
      </button>
      <button onClick={handleDelete} disabled={loading} className="font-medium text-red-600 hover:text-red-700">
        {loading ? "Deleting…" : "Confirm delete"}
      </button>
    </span>
  );
}
