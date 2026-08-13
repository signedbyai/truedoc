"use client";

import { useState } from "react";
import Image from "next/image";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";

// Variant E, direct ask 2026-08-13: cleanup pass on D's tab switcher.
// Report: "the hero images are different sizes so when the page expands
// the pill and text on the left jumps up and down depending on what hero
// image you are on."
//
// Root cause: D's tabs sized the image with plain width/height and let the
// box's own height follow each image's native aspect ratio — Sign is a
// wide two-device composite (1642x1070, ratio 1.54) while Seal/Quote/Draft
// are near-square product screenshots (ratio 1.10-1.18). At the hero's
// ~530px column width that's a ~340px vs ~470px swing in the tab panel's
// height, and D's outer grid used `items-center`, so the LEFT column
// (headline/CTA) re-centered against that changing row height every time
// the tab changed — that's the actual jump, not just the image itself
// moving.
//
// Two-part fix, not just a bigger container:
// 1. The image slot is now a FIXED-height box (h-[280px] sm:h-[380px]) so
//    switching tabs never changes this component's own height at all.
// 2. `object-cover` (not `object-contain`) — checked the actual source
//    images before choosing this: Seal's invoice screenshot has almost no
//    safe crop margin (content runs close to the image's own edges), so a
//    small centered crop from `object-cover` is safer than permanently
//    re-exporting/cropping the PNGs, and it avoids `object-contain`'s
//    empty letterbox bars (worse for the "images are inconsistent sizes"
//    complaint, not better). This crops a modest amount off Sign's wider
//    composite; `object-position` is biased slightly right so the crop
//    favors the phone-signing overlay over the plainer desktop background
//    behind it.
// homepage-preview-e.tsx's own top comment covers the matching outer-grid
// change (items-start instead of items-center) — that's the fix that
// removes the jump unconditionally, this fixed box is what makes the tab
// panel itself look considered rather than just non-jumpy.
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
    // 2026-08-13 QA round: Michael's own screenshot showed too much of the
    // desktop-editor background still surviving the crop (logo reading as
    // "dBy", "Recipients:" as "ts:") while the whole point of this image
    // is the mobile signing overlay — moved from a soft 65% lean to a hard
    // right anchor so the phone is never the thing that gets cut.
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
    // Direct ask: top-right anchor so the Verified & Sealed medallion
    // (and its own QR) is never cropped, even though it costs some of the
    // invoice body below it.
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
    // Direct ask: top anchor so "Generate your Magic Quote" is always
    // visible, even though it costs some of the line-items area below.
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
    // Same reasoning as Quote — top anchor keeps "Generate your Draft" visible.
    objectPosition: "center top",
    Icon: Sparkles,
  },
];

export function InteractiveProductTabsE() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <div className="w-full">
      {/* 2026-08-13 QA round: at real iPhone widths (~340-345px content
          width after padding) four icon+label pills need ~410px in one
          row, so plain flex-wrap produced a ragged 3+1 split (Michael's
          own screenshot: Sign/Seal/Quote on row one, Draft orphaned alone
          on row two). Below sm, force an even 2x2 grid instead — same
          idea, deliberate instead of an overflow accident. At sm+ there's
          room for all four in a row, so it reverts to the original
          auto-width flex row. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start">
        {TABS.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={isActive}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors sm:w-auto sm:justify-start ${
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

      {/* Fixed min-height on the description too — "Seal" and "Draft"'s
          copy run to two lines on narrower columns while "Quote" fits one,
          which is a much smaller version of the same jump problem. */}
      <p
        key={`${tab.key}-desc`}
        className="mt-4 min-h-[2.5rem] text-center text-sm text-slate-600 sm:text-left"
      >
        {tab.description}
      </p>

      {/* Fixed-height image slot — see this file's top comment for why
          object-cover was chosen over object-contain, and why the height
          numbers below were picked. */}
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
