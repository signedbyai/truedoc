"use client";

import { useState } from "react";
import Image from "next/image";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";

// Variant D's own idea (2026-08-12, "freedom to make your own"): instead of
// an auto-playing crossfade (B) or one static shot (v26/C), the visitor
// picks which of Sign/Seal/Quote/Draft to look at — real interactivity
// rather than a passive animation. Two side benefits, not just novelty:
// (1) it sidesteps the entire class of CSS animation-delay/keyframe-timing
// bugs this session spent many passes chasing on the crossfade (see
// homepage-tier1-preview.tsx's own history) — there's no timing to get
// right, just React state; (2) a visitor who clicks around is a stronger
// engagement signal than one who watches a loop play.
//
// This is its own "use client" file, not inlined into homepage-preview-d.tsx,
// so only this one interactive piece opts out of server rendering — the
// rest of that page stays a plain server component (same boundary-drawing
// already used elsewhere in this app, e.g. referral-capture.tsx).
const TABS: {
  key: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  width: number;
  height: number;
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
    Icon: Sparkles,
  },
];

export function InteractiveProductTabs() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <div className="w-full">
      {/* Tab pills — the active one filled yellow (this app's one CTA
          color, reused here since a tab selection is a real, if small,
          user action), inactive ones plain bordered. */}
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        {TABS.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-yellow-300 text-slate-900"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <t.Icon className="h-4 w-4" strokeWidth={1.75} />
              {t.title}
            </button>
          );
        })}
      </div>

      {/* Description swaps with the tab — same real per-feature copy the
          other variants use, just one shown at a time instead of stacked. */}
      <p key={`${tab.key}-desc`} className="mt-4 text-center text-sm text-slate-600 sm:text-left">
        {tab.description}
      </p>

      {/* Image swaps with the tab. No fill/aspect-ratio wrapper trickery
          needed here (unlike the crossfade's own history) — only one
          image is ever mounted at a time, so a plain sized <Image> with
          its own real width/height is enough. */}
      <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
        <Image
          key={tab.key}
          src={tab.image}
          alt={tab.alt}
          width={tab.width}
          height={tab.height}
          sizes="(min-width: 1024px) 32rem, (min-width: 640px) 28rem, 90vw"
          priority={active === 0}
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
