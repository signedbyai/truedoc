"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Auto-shows once, ever, the first time this button renders — explains that
// the button (renamed from "Upload document" 2026-07-25, see
// new-document-client.tsx) now opens into three ways to start a document,
// not just a file picker. Same localStorage-gate-once pattern as
// field-editor.tsx's LOCK_HINT_SEEN_KEY, but with a close button instead of
// a timeout: there's two features' worth of copy here, not one sentence, so
// dismissal should be a deliberate read-and-close rather than a clock.
const HINT_SEEN_KEY = "sb_new_doc_hint_seen";

export function NewDocumentButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(HINT_SEEN_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    // Deferred a tick — same react-hooks/set-state-in-effect workaround used
    // elsewhere in the app (field-editor.tsx's own hint effect, signer-auth-gate.tsx).
    Promise.resolve().then(() => setOpen(true));
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      // ignore — worst case the hint shows again next visit
    }
  }

  return (
    <div className="relative flex-1 sm:flex-none">
      <Link
        href="/dashboard/documents/new"
        onClick={dismiss}
        className={cn(buttonVariants({ size: "sm" }), "w-full rounded-lg px-2.5 sm:min-w-[10.5rem] sm:px-3")}
      >
        New document<span className="hidden sm:inline"> →</span>
      </Link>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={dismiss}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-slate-900">More than an upload button now</p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close"
                className="-mr-1 -mt-1 shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-xs font-normal leading-snug text-slate-600">
              AI Drafter and Magic Quote live here too — describe what you need in plain language and get a starting
              draft or a price quote instead of uploading a file.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
