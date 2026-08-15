"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";

// Variant G, direct ask 2026-08-13: "can we try a Variant G with the
// rotating carousel to see that in action". Identical to F — same
// icon-only mobile pills, same fixed-height image slot, same crop anchors
// — except the tabs auto-advance.
//
// Why this exists: F's tab switcher requires a TAP, and 92% of this site's
// traffic is mobile with a 78% bounce rate, so in practice the large
// majority only ever see tab 1 (Sign) and the other three products are
// invisible to them. Auto-advancing is the obvious fix, and this variant
// is here to see whether it reads as helpful or as an annoying carousel.
//
// Four behaviours that make this an honest carousel rather than a
// hostile one, all deliberate:
//  1. STOPS PERMANENTLY once the visitor taps a tab. They've expressed a
//     preference; yanking the panel away from under them afterwards is
//     the single most irritating thing auto-rotators do.
//  2. PAUSES on hover and on keyboard focus anywhere in the component, so
//     it can't move while someone is reading or tabbing through.
//  3. RESPECTS prefers-reduced-motion — no auto-advance at all for
//     visitors who've asked for less motion. This is also what keeps it
//     the right side of WCAG 2.2.2 (Pause, Stop, Hide) for anything that
//     auto-updates for more than 5 seconds.
//  4. 5s dwell, slow enough to actually read the description before it
//     moves. Shorter felt frantic when reasoning about the copy lengths
//     (the Seal and Draft descriptions run to two lines).
//
// Keep the TABS data below in sync with homepage-preview-f-tabs.tsx — it's
// copied unchanged, only the rotation behaviour differs.
const AUTO_ADVANCE_MS = 5000;

const TABS: {
  key: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  width: number;
  height: number;
  objectPosition?: string;
  Icon: typeof Signature;
}[] = [
  {
    key: "sign",
    title: "Sign",
    description: "Place signature, initials, date, and text fields on any PDF, then send for signature in seconds.",
    image: "/hero-sign-mobile-composite.png",
    alt: "The SignedBy field editor with the mobile signing screen overlaid, showing the Slide to sign & submit control",
    width: 1642,
    height: 1070,
    objectPosition: "right top",
    Icon: Signature,
  },
  {
    key: "seal",
    title: "Seal",
    description:
      "Self-sign and lock a document with an identity-verified, RFC 3161 trusted-timestamped seal — no recipient required.",
    image: "/hero-verified-badge-invoice-d.png",
    alt: "An invoice with the SignedBy Verified & Sealed medallion stamped over its top-right corner",
    width: 740,
    height: 650,
    objectPosition: "right top",
    Icon: ShieldCheck,
  },
  {
    key: "quote",
    title: "Quote",
    description: "Describe the job in plain language and Magic Quote turns it into a signable, itemized quote.",
    image: "/hero-magic-quote.png",
    alt: "The Magic Quote itemized editor: quote title, currency, bill-to, and line items with computed totals",
    width: 568,
    height: 483,
    objectPosition: "center top",
    Icon: Receipt,
  },
  {
    key: "draft",
    title: "Draft",
    description: "Describe what you need and AI drafts a ready-to-send agreement — review, edit, and send in the same flow.",
    image: "/hero-new-document-draft.png",
    alt: "The Draft tab: document type and language pickers, a plain-language description, and a Generate draft button",
    width: 567,
    height: 513,
    objectPosition: "center top",
    Icon: Sparkles,
  },
];

export function InteractiveProductTabsG() {
  const [active, setActive] = useState(0);
  // Set once and never unset — see behaviour (1) in this file's top comment.
  const [visitorTookControl, setVisitorTookControl] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Read the media query in an effect rather than during render — it isn't
  // available server-side, and reading it in render would desync hydration.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const stopped = visitorTookControl || paused || reducedMotion;

  // setActive via the functional form so this interval never needs `active`
  // in its dep array — otherwise every tick would tear down and rebuild the
  // timer, and the dwell on each tab would drift.
  const stoppedRef = useRef(stopped);
  stoppedRef.current = stopped;
  useEffect(() => {
    if (stopped) return;
    const id = window.setInterval(() => {
      if (stoppedRef.current) return;
      setActive((i) => (i + 1) % TABS.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [stopped]);

  const tab = TABS[active];

  return (
    <div
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        {TABS.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActive(i);
                setVisitorTookControl(true);
              }}
              aria-pressed={isActive}
              aria-label={t.title}
              className={`flex h-11 w-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors sm:h-auto sm:w-auto sm:justify-start sm:px-3.5 sm:py-2 ${
                isActive
                  ? "bg-yellow-300 text-slate-900"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <t.Icon className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">{t.title}</span>
            </button>
          );
        })}
      </div>

      <p
        key={`${tab.key}-desc`}
        className="mt-4 min-h-[2.5rem] text-center text-sm text-slate-600 sm:text-left"
      >
        {tab.description}
      </p>

      <div className="relative mt-5 h-[280px] w-full overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] sm:h-[380px]">
        {/* All four images are rendered, with only the active one visible,
            rather than swapping a single <Image src>. On a rotating panel a
            src swap means a network fetch mid-rotation the first time each
            tab comes up — visible as a flash of empty box. Keeping them
            mounted costs four decodes up front and makes every subsequent
            rotation instant. `priority` stays on the first only. */}
        {TABS.map((t, i) => (
          <Image
            key={t.key}
            src={t.image}
            alt={i === active ? t.alt : ""}
            aria-hidden={i !== active}
            fill
            sizes="(min-width: 1024px) 32rem, (min-width: 640px) 28rem, 90vw"
            priority={i === 0}
            className={`object-cover transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-0"}`}
            style={{ objectPosition: t.objectPosition ?? "center" }}
          />
        ))}
      </div>
    </div>
  );
}
