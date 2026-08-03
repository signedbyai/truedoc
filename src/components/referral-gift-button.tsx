"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, Copy, Check, X } from "lucide-react";
import { computePopoverPosition, type PopoverCoords } from "@/lib/popover-position";

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
//
// `variant="pill"` (2026-08-04, direct feedback: the referral entry point
// existed on the main dashboard nav but not anywhere inside
// console.signedby.ai, on either Free or Pro+) — sized and themed to sit
// as an icon in console-workspace.tsx's dark floating pill
// (Home/History/Templates/⋯), matching those buttons' own h-8 w-8/
// text-neutral-300/hover:bg-white/10 styling exactly, with a dark popover
// instead of the light one the dashboard's "icon"/"label" variants use.
//
// The popover renders via a portal into `document.body`, positioned with
// `position: fixed` from `computePopoverPosition` (popover-position.ts) —
// NOT plain CSS `absolute`/`right-0`/`left-0` anymore. Two real bugs found
// 2026-08-04 forced this: (1) "on full screen only the referral popover
// disappears off to the left of the window" — a plain `absolute right-0`
// popover growing left ran past the viewport edge when this button sits
// near the left of a wide screen (as it does in console's pill). Flipping
// to `left-0` (an `align` prop, first attempted fix) didn't actually solve
// it: (2) the pill lives inside console-workspace.tsx's `overflow-y-auto`
// aside, and the pill's own wrapper has `backdrop-blur` — which
// establishes a containing block for `position: fixed` descendants, same
// as `transform` does. Any CSS-anchored popover nested in that markup
// gets clipped by the aside's scroll bounds or re-contained by the
// backdrop-blur ancestor, which is what "popover renders underneath the
// settings panel" actually was. A portal is the real fix: the DOM node is
// moved to be a direct child of `<body>`, escaping every ancestor's
// overflow/containing-block behavior entirely, positioned purely by the
// inline `top`/`left` computed from the trigger button's own
// `getBoundingClientRect()`. `align` is now just the *preferred* growth
// direction — `computePopoverPosition`'s own viewport clamp is what
// actually guarantees it never runs off-screen, regardless of context.
// Console's mobile pill passes `align="center"` (added same day, direct
// follow-up: edge-anchoring landed the popover hard against the screen's
// right edge instead of roughly under the centered pill's icon) — see
// popover-position.ts's own comment on that value.
const SEEN_KEY = "sb_ref_gift_seen";
const POPOVER_WIDTH = 288; // w-72

export function ReferralGiftButton({
  variant = "icon",
  align = "right",
}: {
  variant?: "icon" | "label" | "pill";
  align?: "left" | "right" | "center";
}) {
  const [link, setLink] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [copied, setCopied] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [creditsPerReferral, setCreditsPerReferral] = useState(5);
  const isFree = plan === "free";
  const [seen, setSeen] = useState(true); // assume seen until we know otherwise, avoids a dot-flash
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    if (!open && buttonRef.current) {
      setCoords(computePopoverPosition(buttonRef.current.getBoundingClientRect(), POPOVER_WIDTH, align, window.innerWidth));
    }
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
  const dark = variant === "pill";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label="Refer a friend"
        title={dark ? "Refer a friend" : undefined}
        aria-expanded={open}
        className={
          variant === "label"
            ? "relative flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            : dark
              ? "relative flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white"
              : "relative flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
        }
      >
        <Gift className={dark ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={1.75} />
        {variant === "label" && <span>Refer a friend</span>}
        {showDot && (
          <span
            className={`absolute right-1 top-1 h-2 w-2 rounded-full border bg-orange-500 ${dark ? "border-neutral-800" : "border-white"}`}
          />
        )}
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
              className={`fixed z-50 ${
                dark
                  ? "rounded-xl border border-white/10 bg-neutral-900 p-4 shadow-lg shadow-black/40 backdrop-blur"
                  : "rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
              }`}
            >
              <div className="flex items-start justify-between">
                <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                  {isFree ? "Share the seal, get credits" : "Give a month, get a month"}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className={dark ? "-mr-1 -mt-1 text-neutral-400 hover:text-white" : "-mr-1 -mt-1 text-slate-400 hover:text-slate-600"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className={`mt-1 text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>
                {isFree
                  ? `When someone signs up with your link and verifies their identity to seal their first Verified Badge document, you get ${creditsPerReferral} seal credits and they get 3 — no payment required.`
                  : "When someone signs up with your link and subscribes, they get their first month of Pro free — and so do you."}
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  readOnly
                  value={link ?? ""}
                  onFocus={(e) => e.currentTarget.select()}
                  className={
                    dark
                      ? "flex-1 rounded-md border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200"
                      : "flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                  }
                />
                <button
                  type="button"
                  onClick={copy}
                  disabled={!link}
                  className={
                    dark
                      ? "flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50"
                      : "flex items-center gap-1 rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  }
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {/* The popover is the entry point most people actually use —
                  it's in the nav on every page, where the dashboard card
                  only appears on home. It needs the terms link just as
                  much. */}
              <a
                href="/referral-terms"
                className={
                  dark
                    ? "mt-3 inline-block text-xs font-medium text-neutral-400 hover:text-neutral-200"
                    : "mt-3 inline-block text-xs font-medium text-slate-500 hover:text-slate-700"
                }
              >
                Terms and conditions
              </a>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
