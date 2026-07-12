"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Draft-only per the API route (src/app/api/documents/[id]/route.ts DELETE)
// — this component doesn't re-check status itself, so only render it where
// the caller already knows the document is a draft.
export function DeleteDocumentButton({
  documentId,
  redirectTo,
  className,
}: {
  documentId: string;
  // If set, navigates here after a successful delete (the detail page for a
  // now-deleted document has nothing left to show). If omitted, refreshes
  // the current page instead (e.g. a list row disappearing in place).
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't delete this document.");
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <div className={className}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
        >
          Delete draft
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className} onClick={(e) => e.preventDefault()}>
      <div className="rounded-md border border-red-200 bg-red-50 p-3">
        <p className="text-xs text-red-700">
          This permanently deletes the draft and its file. This can&apos;t be undone.
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirming(false);
            }}
            disabled={loading}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
            disabled={loading}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Yes, delete it"}
          </button>
        </div>
      </div>
    </div>
  );
}
