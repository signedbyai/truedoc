"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VoidDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVoid() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/void`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't void this document.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <div>
        <button
          onClick={() => setConfirming(true)}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Void this document
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-xs text-red-700">
        This cancels the signing request for everyone — signing links stop working immediately. This can&apos;t be
        undone.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={handleVoid}
          disabled={loading}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Voiding…" : "Yes, void it"}
        </button>
      </div>
    </div>
  );
}
