"use client";

import { useState } from "react";
import Image from "next/image";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";

// Variant F, direct ask 2026-08-13: "an alternative to compare" against
// E's mobile pill treatment. Identical to E in every other way — same
// fixed-height image slot, same object-cover crop anchors, same
// description min-height — this file only exists to A/B the tab row
// itself. Everything else in this component is a straight copy of
// homepage-preview-e-tabs.tsx; keep the two in sync if either the image
// data or the crop anchors change.
//
// E's answer to "4 pills don't fit one row on an iPhone" was a deliberate
// 2x2 grid, keeping the icon+label pills exactly as sized for desktop.
// This is the other real option that was on the table: icon-only pills on
// mobile (no visible label — accessible name still carries via
// aria-label), single row, all four fit comfortably even on the
// narrowest common iPhone content width (~327px: 4 * 44px buttons + 3 *
// 8px gaps = 200px, well under). Same `hidden sm:inline` idiom already
// used elsewhere on this page (the "Teams save $700+/year" badge) for
// showing/hiding text at the sm breakpoint, not a new pattern.
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

export function InteractiveProductTabsF() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <div className="w-full">
      {/* Single row at every width — icon-only on mobile (44px circular
          buttons, comfortably one row on every iPhone), icon+label from
          sm up. No grid, no wrap needed: 4 * 44px + 3 * 8px gaps = 200px,
          fits well inside even a 375px-wide phone's content area. */}
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        {TABS.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(i)}
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
        <Image
          key={tab.key}
          src={tab.image}
          alt={tab.alt}
          fill
          sizes="(min-width: 1024px) 32rem, (min-width: 640px) 28rem, 90vw"
          priority={active === 0}
          className="object-cover"
          style={{ objectPosition: tab.objectPosition ?? "center" }}
        />
      </div>
    </div>
  );
}
