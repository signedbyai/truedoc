"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { MENU_ITEM_CLASS, TrashIcon } from "@/components/ui/menu-item";
import { cn } from "@/lib/utils";

// Draft-only per the API route (src/app/api/documents/[id]/route.ts DELETE)
// — this component doesn't re-check status itself, so only render it where
// the caller already knows the document is a draft.
export function DeleteDocumentButton({
  documentId,
  redirectTo,
  className,
  asMenuItem = false,
  onSelect,
}: {
  documentId: string;
  // If set, navigates here after a successful delete (the detail page for a
  // now-deleted document has nothing left to show). If omitted, refreshes
  // the current page instead (e.g. a list row disappearing in place).
  redirectTo?: string;
  className?: string;
  // Renders as a full-width menu row and confirms in a modal dialog rather
  // than expanding a red panel in place. Inline expansion is fine in a list
  // row, where the panel appears next to the thing it refers to; inside a
  // menu it resizes the menu under the cursor and the menu can be dismissed
  // mid-confirm, which is a poor way to run an irreversible action.
  asMenuItem?: boolean;
  // Called when the row is chosen, so the parent can close its menu before
  // the dialog opens.
  onSelect?: () => void;
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

  const trigger = (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.();
        setConfirming(true);
      }}
      className={
        asMenuItem
          ? cn(MENU_ITEM_CLASS, "text-red-600 hover:bg-red-50")
          : cn(buttonVariants({ variant: "destructive", size: "sm" }))
      }
    >
      {asMenuItem && <TrashIcon />}
      Delete draft
    </button>
  );

  // Menu mode: the row itself never changes shape. The confirm is a dialog on
  // top, so it survives the menu closing underneath it.
  if (asMenuItem) {
    return (
      <div className={className}>
        {trigger}
        {error && !confirming && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {confirming && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-draft-title"
            onClick={() => {
              if (!loading) setConfirming(false);
            }}
          >
            <div
              // Matches the standard modal treatment used everywhere else
              // (bulk-send, field-editor's confirmation dialogs,
              // signing-view) — rounded-lg, no border. This was the one
              // outlier using Card's bordered rounded-xl instead; brought
              // in line 2026-07-22 (design-audit-2026-07-22.md, project
              // root), not the other way around, since the majority
              // pattern was 9 modals to 1.
              className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-draft-title" className="text-base font-semibold text-slate-900">
                Delete this draft?
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                This permanently deletes the draft and its file. This can&apos;t be undone.
              </p>
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Deleting…" : "Delete draft"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className={className}>
        {trigger}
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
