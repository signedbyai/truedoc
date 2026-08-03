"use client";

import { useEffect, useState } from "react";
import { Gift, Copy, Check, X } from "lucide-react";

// Persistent header entry point for the referral programme. The bigger
// ReferralCard still lives on the dashboard home and is what actually
// *claims* a pending ?ref on signup — this button only reads the org's own
// link so it can be shared from any page. A one-time orange nudge dot
// (localStorage) fades after the first open so it's discoverable without
// nagging.
//
// Plan-conditional copy (REFERRAL_SCOPE.md, 2026-08-03) — same branch as
// ReferralCard: Free gets the seal-credits pitch, Pro+ keeps "give a month,
// get a month" unchanged.
const SEEN_KEY = "sb_ref_gift_seen";

export function ReferralGiftButton({ variant = "icon" }: { variant?: "icon" | "label" }) {
  const [link, setLink] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [creditsPerReferral, setCreditsPerReferral] = useState(5);
  const isFree = plan === "free";
  const [seen, setSeen] = useState(true); // assume seen until we know otherwise, avoids a dot-flash

  useEffect(() => {
    // Reading localStorage + setState happen inside the async .then (not
    // synchronously in the effect body) — the setState-in-effect lint rule
    // only flags the synchronous case, and the dot isn't meaningful until
    // we know a referral link exists anyway.
    let active = true;
    fetch("/api/referral/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.link) setLink(data.link);
        setPlan(data?.plan ?? "free");
        setCreditsPerReferral(data?.creditsPerReferral ?? 5);
        try {
          setSeen(window.localStorage.getItem(SEEN_KEY) === "1");
        } catch {
          setSeen(true);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggle() {
    setOpen((o) => !o);
    if (!seen) {
      setSeen(true);
      try {
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }
  }

  function copy() {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => {}
    );
  }

  // Referral not available for this org — render nothing rather than a dead button.
  if (loaded && !link) return null;

  const showDot = !seen && !open;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Refer a friend"
        aria-expanded={open}
        className={
          variant === "label"
            ? "relative flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            : "relative flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
        }
      >
        <Gift className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {variant === "label" && <span>Refer a friend</span>}
        {showDot && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-orange-500" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {isFree ? "Share the seal, get credits" : "Give a month, get a month"}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {isFree
                ? `When someone signs up with your link and verifies their identity to seal their first Verified Badge document, you get ${creditsPerReferral} seal credits and they get 3 — no payment required.`
                : "When someone signs up with your link and subscribes, they get their first month of Pro free — and so do you."}
            </p>
            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={link ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
              />
              <button
                type="button"
                onClick={copy}
                disabled={!link}
                className="flex items-center gap-1 rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {/* The popover is the entry point most people actually use — it's
                in the nav on every page, where the dashboard card only appears
                on home. It needs the terms link just as much. */}
            <a
              href="/referral-terms"
              className="mt-3 inline-block text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Terms and conditions
            </a>
          </div>
        </>
      )}
    </div>
  );
}
