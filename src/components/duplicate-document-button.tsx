"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Non-destructive, so unlike DeleteDocumentButton this has no confirm step —
// a single click duplicates and lands on the new draft's field editor.
// Works for a document in any status (draft/sent/completed/declined/
// voided), per POST /api/documents/[id]/duplicate.
export function DuplicateDocumentButton({ documentId, className }: { documentId: string; className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't duplicate this document.");
      router.push(`/dashboard/documents/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        onClick={handleDuplicate}
        disabled={loading}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        {loading ? "Duplicating…" : "Duplicate"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
