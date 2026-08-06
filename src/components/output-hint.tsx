"use client";

// One-time output-education popovers (2026-08-06,
// IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md section 4c) -- the sealed
// document page shows several output buttons (Certificate, Sealed PDF,
// Badge image, verify link) with no guidance on which one to actually send
// a client. Rather than gate this on document-type detection -- explicitly
// ruled out (same call as 1a's placement decision: a wrong guess reads
// worse than no guess, and the user already knows what they uploaded) --
// each hinted button gets a small "best for X" popover shown once per
// browser. Same localStorage-gate-once + deferred-tick pattern as
// new-document-client.tsx's MENU_INTRO_KEY and friends (also
// console-plan-status.tsx's PRODUCT_INTRO_KEY, field-editor.tsx's
// LOCK_HINT_SEEN_KEY) -- one more instance of an established pattern, not a
// new one.
import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function OutputHint({ storageKey, hint, children }: { storageKey: string; hint: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(storageKey) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    // Deferred a tick -- same react-hooks/set-state-in-effect workaround the
    // other one-time hints in this app use.
    Promise.resolve().then(() => setOpen(true));
  }, [storageKey]);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // storage disabled -- just won't persist across reloads, harmless
    }
  }

  return (
    <span className="relative inline-flex">
      {children}
      {open && (
        <>
          {/* Click-outside-to-dismiss overlay -- same shape as
              new-document-client.tsx's own one-time popovers. */}
          <button type="button" aria-hidden="true" tabIndex={-1} onClick={dismiss} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-normal leading-snug text-slate-600">{hint}</p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="-mr-1 -mt-1 shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button type="button" onClick={dismiss} className="mt-2 text-xs font-medium text-slate-900 underline hover:text-slate-600">
              Got it
            </button>
          </div>
        </>
      )}
    </span>
  );
}
