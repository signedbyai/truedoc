"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
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
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={handleVoid} disabled={loading}>
          {loading ? "Voiding…" : "Yes, void it"}
        </Button>
      </div>
    </div>
  );
}
