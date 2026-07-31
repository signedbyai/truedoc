"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { PLAN_LABEL } from "@/lib/plan";

// First-use "what is console, and what does it cost" explainer
// (2026-07-31, direct ask) — a separate thing from the spend-cap intro
// popover on ConsoleUsagePanel (that one explains the $ cap mechanics once
// you already have console access; this one explains that console is a
// free-to-try-but-separately-metered product at all, and shows even to
// locked/Free orgs looking at the upsell state). Tracked in localStorage,
// not a new DB column/migration — this is a one-time, low-stakes UI nudge,
// not billing-relevant state, and localStorage means it ships without
// needing Michael to apply another migration or reopening privacy/legal
// review the way a new cookie would.
const PRODUCT_INTRO_KEY = "signedby-console-product-intro-dismissed";

function useProductIntroVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      const shouldShow = !window.localStorage.getItem(PRODUCT_INTRO_KEY);
      if (!shouldShow) return;
      // Deferred a tick — same react-hooks/set-state-in-effect workaround
      // used elsewhere in the app (new-document-button.tsx, field-editor.tsx).
      Promise.resolve().then(() => setVisible(true));
    } catch {
      // Storage blocked (private browsing etc.) — default to not showing
      // rather than risk re-showing every render with no way to dismiss.
    }
  }, []);
  return [visible, setVisible] as const;
}

/** Bottom-left plan status box + pill for /console/app (2026-07-31, direct
 *  instruction) — always rendered, on every plan, regardless of whether
 *  console is locked or not. Sits last in console-workspace.tsx's flex-col
 *  sidebar so it naturally lands at the very bottom under whatever fills
 *  the rest of the column (history+usage when unlocked, the upgrade panel
 *  when locked) — which also makes it the one spot guaranteed to render for
 *  every visitor (mobile drawer included), the right anchor for a
 *  first-use explainer everyone should see once. */
export function ConsolePlanStatus({ plan, hasAccess }: { plan: string; hasAccess: boolean }) {
  const label = PLAN_LABEL[plan] ?? "Free";
  const [introOpen, setIntroOpen] = useProductIntroVisible();

  function dismissIntro() {
    setIntroOpen(false);
    try {
      window.localStorage.setItem(PRODUCT_INTRO_KEY, "1");
    } catch {
      // Best-effort — worst case it shows again next visit.
    }
  }

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-300">Plan</p>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
            hasAccess ? "border-yellow-300/35 bg-yellow-300/10 text-yellow-300" : "border-white/15 bg-white/5 text-neutral-400"
          }`}
        >
          {label}
        </span>
      </div>
      {hasAccess ? (
        <Link
          href="https://signedby.ai/dashboard/billing"
          className="mt-2 inline-block text-xs text-neutral-500 underline hover:text-neutral-300"
        >
          Manage billing
        </Link>
      ) : (
        <Link
          href="https://signedby.ai/pricing"
          className="mt-2 inline-block text-xs font-medium text-yellow-300 underline hover:text-yellow-200"
        >
          Upgrade to unlock console →
        </Link>
      )}

      {introOpen && (
        <div className="absolute inset-x-0 bottom-full z-10 mb-3">
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white">What is console?</p>
              <button
                type="button"
                onClick={dismissIntro}
                aria-label="Dismiss"
                className="-mr-1 -mt-1 rounded-md p-1 text-neutral-500 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
              Console is free to try for Pro plans and above. It&apos;s a separate, metered signing-infrastructure
              product on top of your regular plan — built for heavy users and large-scale senders who want to send,
              track, and manage documents by chatting directly, billed apart from your normal usage.
            </p>
            <button type="button" onClick={dismissIntro} className="mt-3 text-xs font-medium text-yellow-300 underline hover:text-yellow-200">
              Got it
            </button>
          </div>
          <div className="mx-4 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-r border-white/10 bg-neutral-900" />
        </div>
      )}
    </div>
  );
}
