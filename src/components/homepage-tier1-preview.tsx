import Image from "next/image";
import Link from "next/link";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { TRUSTED_BY, PRICING } from "@/lib/homepage-content";

// Tier 1 from ARACOR_INSPIRED_PRIORITIES.md — a homepage variant to review
// on dev before any decision to promote it, NOT wired into the live
// homepageVariantFlag A/B test (see src/flags.ts). Deliberately its own
// route (src/app/home-preview/page.tsx) rather than a third flag value: the
// flag system exists for measured, tracked traffic splits with real
// methodology, which is premature before Michael has even looked at this.
//
// Two Tier 1 ideas, same capture work per the doc: a looping "hero video"
// (built here as a pure-CSS crossfade of real screenshots already in
// public/ — see globals.css's .animate-hero-crossfade — rather than an
// actual screen recording, since no capture pipeline exists in the
// sandbox), and a screenshot-paired "why SignedBy" section (Aracor's
// 6-reasons pattern).
//
// 2026-08-12, direct ask: reasons rebuilt to match the product's own
// Sign/Seal/Quote/Draft framing exactly — same order, same lucide icons
// (Signature/ShieldCheck/Receipt/Sparkles), same single-word labels as the
// 4-tab picker on /dashboard/documents/new (new-document-client.tsx,
// VERIFIED_BADGE_DASHBOARD_SCOPE.md's "direct instruction" order). Ties
// the marketing page to the exact vocabulary a new user sees on day one
// instead of an ad-hoc set of benefits.
//
// 2026-08-12, second direct-ask pass after Michael reviewed the rebuilt
// version live on dev: "the hero images need some work." All four images
// swapped again:
// - Sign: hero-sign-mobile-composite.png (scripts/generate-hero-sign-mobile-
//   composite.tsx) — the desktop field editor with the real mobile "Slide to
//   sign & submit" screenshot (hero-signer-mobile.png) framed as a phone and
//   overlaid large on the right, same layered-artifact composition as Seal's
//   card below. Chosen over the simpler "just swap in the mobile shot alone"
//   option, direct ask.
// - Seal: hero-verified-badge-invoice-d.png — was verified-seal-badge.png
//   (the bare medallion on its own). Now the medallion stamped over an
//   actual invoice's top-right corner (already existed, built 2026-08-09 for
//   the invoice-badge guide), so the card visibly sells "great for
//   invoices" instead of showing the badge in isolation.
// - Quote: unchanged (hero-magic-quote.png) — direct ask, "Quote i think
//   it's fine."
// - Draft: hero-new-document-draft.png (scripts/generate-hero-new-document-
//   draft.tsx) — was hero-ai-draft-mockup.png, a stylized two-panel pitch-
//   deck mockup that didn't match the real single-column sequential flow
//   (see that script's own comment). Rebuilt as a faithful recreation of the
//   real /dashboard/documents/new page with the Draft tab active — every
//   string reused verbatim from new-document-client.tsx/ai-draft-form.tsx/
//   ai-draft-types.ts (tab row, heading, form fields, real disclaimer/
//   checkbox copy) — not a captured screenshot (no authenticated dashboard
//   session was reachable from this sandbox to shoot one), but no invented
//   copy or layout either, per Michael's own "keep it simple" framing.
//
// 2026-08-12, third pass, direct follow-up after Michael looked at the
// second pass live on dev:
// - Sign: same hero-sign-mobile-composite.png file, rebuilt. The first
//   version's "desktop field editor" half was a simplified/fabricated
//   recreation, not the real screenshot — flagged as "the wrong image."
//   Now composites the phone directly over the REAL hero-field-editor.png,
//   positioned so the overlap covers the Send/Suggest-fields buttons and
//   blank canvas margin, not the two real signature blocks near the bottom.
// - Seal: same hero-verified-badge-invoice-d.png file, trimmed — its own
//   canvas had a `flex: 1` gap between "Total due" and the QR row that
//   stretched to fill the whole fixed-height card regardless of content;
//   now a fixed, content-sized gap (920px tall canvas → 650px). Shared with
//   the real /verified-badge-invoices page and its own hardcoded
//   width/height, updated there too.
// - Quote: hero-magic-quote.png edited in place (scripts/edit-hero-magic-
//   quote.py — a real captured screenshot, not a next/og render, so this is
//   raster editing, not a source-of-truth re-run). Cropped out the "Tax
//   rate %"/"Notes" fields, and recolored "Create document" from the plain
//   shadcn-default dark button to this app's real brand cta style
//   (bg-yellow-300/text-slate-900) — a deliberate marketing-asset deviation
//   from what the live button looks like today, direct ask. Shared with the
//   three real /magic-quote pages (base + us-subcontractors + au-tradies),
//   all of which had their own hardcoded width/height updated to match so
//   the now-shorter image doesn't stretch there.
// - Draft: hero-new-document-draft.png rebuilt again — dropped the "New
//   document" h1, the 4-tab picker, and the yellow spark icon badge (all
//   redundant once this sits inside the homepage's own Sign/Seal/Quote/
//   Draft reasons row, which already carries an icon+label for this card).
//   Mashed up with ai-draft-form.tsx's own "review" step — the real next
//   screen this form advances to — rather than stopping at the input form:
//   Document title + a 3-section preview of the generated draft body (real
//   step shows an editable 18-row textarea; this trims to an illustrative
//   preview, same demo-content spirit as the rest of this file) + "Create
//   document →" using that step's real plain-dark button styling
//   (deliberately NOT recolored like Quote's — no instruction to deviate
//   from the live product here).
//
// 2026-08-12, fourth pass, direct follow-up: two real fixes plus a course
// correction on the previous pass's assumptions.
// - Animation bug: the hero crossfade's per-image animationDelay used
//   `i * -HERO_LOOP_SECONDS / length` (negative). Negative animation-delay
//   fast-forwards an element into its own cycle, so a LARGER negative
//   offset (higher i) reaches its visible window SOONER in wall-clock time
//   — the opposite of the intended stagger. Order was actually ~1,0,3,2
//   instead of 0,1,2,3 ("out of sequence," direct report). Fixed by
//   dropping the negative sign.
// - Quote and Draft: Michael supplied real, CURRENT screenshots of both
//   screens directly (not requested — sent while reviewing the previous
//   pass), which turned out to contradict two assumptions the previous
//   pass made: (1) hero-magic-quote.png was a stale Jul-29 capture that
//   predated the 2026-08-05 redesign — the real current itemized-quote
//   screen has the same centered yellow-badge/heading treatment
//   Seal/Draft already got, not the plain left-aligned title the old
//   capture showed. (2) the "left-justify Draft's heading to match
//   Quote" ask was built on that stale reference — once the real Quote
//   screenshot showed centered, Michael confirmed Draft should STAY
//   centered too ("it's all centered now"). Both images replaced outright
//   with the real screenshots (edit-hero-magic-quote.py's job shrank to
//   just cropping "Valid until" + truncating before "Tax rate %" on the
//   NEW capture; generate-hero-new-document-draft.tsx is fully
//   superseded, real screenshot used as-is, no edits needed). This also
//   resolves the earlier font-size mismatch a different way than
//   planned — both real captures share the same 567px source width, so
//   nominal text sizes now match on the page without any manual scaling.
//
// 2026-08-12, fifth pass, direct follow-up: "remove the badges from the
// images in Magic Quote and Draft since in the page there is already a
// badge. Add in the yellow button at the bottom of the Magic Quote,
// remove the legal disclaimer and consent area from the Draft image."
// - Quote and Draft: both real screenshots had a centered yellow icon
//   badge at the top (Aug-5 redesign treatment) that duplicates the
//   badge already shown in the reasons-grid row below — cropped out of
//   both (scripts/edit-hero-magic-quote.py, scripts/edit-hero-new-
//   document-draft.py), new dimensions 568x483 and 567x513.
// - Quote: appended a synthesized yellow "Create document →" button at
//   the bottom — this is the real review-step button from
//   magic-quote-form.tsx (real copy, real position), just recolored
//   yellow/navy to match this app's marketing-asset brand cta style
//   instead of the plain dark Button it renders as live. It's the actual
//   form's own button rendered in the graphic, not an added marketing
//   CTA element.
// - Draft: cut the amber legal-disclaimer banner + "I understand..."
//   consent checkbox block, so the Describe-what-you-need field flows
//   straight into the real "Generate draft" button.
// The Sign/Seal/Draft-heading/animation-order work from earlier passes is
// unchanged; see above for that history.
//
// Copy for the hero (headline/subhead/value props/pricing/trusted-by) is
// deliberately identical to homepage-current.tsx's proven version — this
// is asset/visual work, not a copy test, so nothing about the words
// changes here.

const REASONS: {
  title: string;
  description: string;
  image: string;
  alt: string;
  width: number;
  height: number;
  Icon: typeof Signature;
}[] = [
  {
    title: "Sign",
    description: "Place signature, initials, date, and text fields on any PDF, then send for signature in seconds.",
    image: "/hero-sign-mobile-composite.png",
    alt: "The SignedBy field editor with the mobile signing screen overlaid, showing the Slide to sign & submit control",
    width: 1642,
    height: 1070,
    Icon: Signature,
  },
  {
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
    title: "Quote",
    description: "Describe the job in plain language and Magic Quote turns it into a signable, itemized quote.",
    image: "/hero-magic-quote.png",
    alt: "The Magic Quote itemized editor: quote title, currency, bill-to, and line items with computed totals",
    width: 568,
    height: 483,
    Icon: Receipt,
  },
  {
    title: "Draft",
    description: "Describe what you need and AI drafts a ready-to-send agreement — review, edit, and send in the same flow.",
    image: "/hero-new-document-draft.png",
    alt: "The Draft tab: document type and language pickers, a plain-language description, and a Generate draft button",
    width: 567,
    height: 513,
    Icon: Sparkles,
  },
];

// The hero crossfade cycles through the same 4 shots, same order, as the
// reasons grid below — one visual vocabulary for the whole page instead of
// a separate curated set for the hero.
const HERO_LOOP = REASONS;
const HERO_LOOP_SECONDS = 12;
// Direct ask 2026-08-12: hold on Sign (index 0) for one extra second
// before the crossfade starts cycling. The total loop grows by that same
// second so Seal/Quote/Draft's original 3-seconds-apart stagger — computed
// below from the unchanged HERO_LOOP_SECONDS — just shifts later by one
// second each, preserving their spacing/overlap instead of compressing it.
// See globals.css's .animate-hero-crossfade-first for the other half of
// this (Sign's own keyframe, opaque from 0% instead of fading in).
const HERO_FIRST_HOLD_EXTRA_SECONDS = 1;
const HERO_TOTAL_LOOP_SECONDS = HERO_LOOP_SECONDS + HERO_FIRST_HOLD_EXTRA_SECONDS;

// Developer/API section — /home-preview-b only (2026-08-12, direct ask:
// "take some inspiration from documenso.com especially the api animation").
// A live Chrome pass over documenso.com found their "API animation" is
// actually a static, full-bleed, syntax-highlighted JSON response panel —
// no motion at all (see HOMEPAGE_HERO_VIDEO_AND_SECOND_HALF_SCOPE.md's
// addendum). Two deliberate departures from copying that panel outright:
// (1) the JSON below is REAL — the exact GET /api/v1/documents/{id}
// response already published on /developers (same id used there,
// 7fdd90eb-...), not an invented shape, matching the same real-facts rule
// the /vs/* pages follow; (2) it's actually animated (a slow vertical
// scroll loop, globals.css's .animate-json-scroll), since that's what was
// asked for, not what Documenso's own page does.
type JsonTok = { t: string; c?: string };
const jline = (...toks: JsonTok[]) => toks;
const KEY = "text-sky-300";
const STR = "text-emerald-300";
const LIT = "text-amber-300";
const PUNCT = "text-slate-500";

const JSON_LINES: JsonTok[][] = [
  jline({ t: "{", c: PUNCT }),
  jline({ t: '  "id"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"7fdd90eb-9152-4031-a767-c0632126dc53"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "title"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"Freelance Agreement"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "status"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"completed"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "created_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"2026-07-28T10:04:00Z"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "updated_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"2026-07-29T09:11:00Z"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "expires_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: "null", c: LIT }, { t: ",", c: PUNCT }),
  jline({ t: '  "signers"', c: KEY }, { t: ": [", c: PUNCT }),
  jline({ t: "    {", c: PUNCT }),
  jline({ t: '      "email"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"jane@acme.com"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "name"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"Jane"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "status"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"signed"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "signed_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"2026-07-29T09:11:00Z"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "auth_required"', c: KEY }, { t: ": ", c: PUNCT }, { t: "false", c: LIT }, { t: ",", c: PUNCT }),
  jline({ t: '      "auth_verified"', c: KEY }, { t: ": ", c: PUNCT }, { t: "false", c: LIT }),
  jline({ t: "    }", c: PUNCT }),
  jline({ t: "  ]", c: PUNCT }),
  jline({ t: "}", c: PUNCT }),
];

function JsonPanelContent() {
  return (
    <>
      {JSON_LINES.map((line, i) => (
        <div key={i} className="whitespace-pre">
          {line.map((tok, j) => (
            <span key={j} className={tok.c}>
              {tok.t}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

function DeveloperApiSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <div className="text-center sm:text-left">
          <div className="mb-3 flex items-center justify-center gap-2.5 sm:justify-start">
            {/* Black badge mark in place of the yellow icon-squares the
                Sign/Seal/Quote/Draft reasons use above — direct ask, "use a
                black version of the logo badge for that dev section in
                place of the other badges." Real brand asset
                (signedby-badge-black-slash-optionC), not a recolored
                lucide icon like the others. */}
            <Image
              src="/brand/signedby-badge-black-small.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg"
            />
            <h2 className="text-2xl font-semibold text-slate-900">Built for developers</h2>
          </div>
          <p className="max-w-sm text-slate-600 sm:max-w-none">
            A REST API and outbound webhooks — create and send documents from your CRM, poll status, or get
            notified the moment something&apos;s signed. Starts metered on Pro, fully unlimited on Business.
          </p>
          <Link
            href="/developers"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-slate-700"
          >
            Check the API docs <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="relative h-64 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.25)]">
          <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-900/95 px-4 py-2.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="ml-2 font-mono">GET /api/v1/documents/{"{id}"}</span>
          </div>
          <div className="h-[calc(100%-2.75rem)] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
            <div className="animate-json-scroll px-4 py-4 font-mono text-xs leading-relaxed">
              <JsonPanelContent />
              {/* Duplicate block for a seamless loop — same technique as
                  the trusted-by marquee's translateX(-50%) above, on the Y
                  axis instead. */}
              <div className="mt-4" aria-hidden="true">
                <JsonPanelContent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomepageTier1Preview({
  currency,
  showDeveloperSection = false,
}: {
  currency: Currency;
  // /home-preview-b only (2026-08-12) — see DeveloperApiSection's own
  // comment above. Defaults false so /home-preview-a is unaffected.
  showDeveloperSection?: boolean;
}) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Image
          src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
          alt="SignedBy"
          width={266}
          height={64}
          className="h-7 w-auto"
          priority
        />
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-16 pb-8 text-center sm:pt-20">
        <Link
          href="/vs/docusign"
          className="mb-5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 sm:text-sm"
        >
          <span className="hidden sm:inline">Teams save</span>
          <span className="sm:hidden">Save</span>
          <span className="font-bold text-yellow-300">$700+/year</span>
          <span>vs DocuSign</span>
          <span className="hidden sm:inline">— see the math</span>
          <span aria-hidden>→</span>
        </Link>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">E-signatures</span>, without
          the per-seat tax
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          SignedBy is a fast, affordable alternative for e-Signatures — built for solo professionals
          and small teams who sign a handful of documents each month, not a whole sales floor.
        </p>
        <CtaLink
          href="/login?intent=signup&utm_source=homepage&utm_medium=cta&utm_campaign=homepage_page&utm_content=tier1-preview"
          className="mt-7"
          color="purple"
          page="homepage"
          position="hero"
          variant="tier1-preview"
        >
          Start for free →
        </CtaLink>
        <p className="mt-3 text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      {/* The "hero video" — a looping crossfade of real screenshots in one
          fixed-size card rather than an actual recorded clip (see the file
          comment above and globals.css's .animate-hero-crossfade). A neutral
          bg-slate-50 card with object-contain lets the 4 pillars' very
          different shapes (field editor landscape, the square seal, the
          tall Quote panel, the two-panel Draft mockup) share one frame
          without any of them looking cropped or stretched. Duration and
          per-image delay both derive from HERO_LOOP_SECONDS /
          HERO_LOOP.length so adding/removing a pillar doesn't require
          re-tuning the timing by hand. prefers-reduced-motion isn't
          special-cased: the crossfade is a slow opacity fade, not motion/
          parallax, so it doesn't trigger the concerns that setting exists
          for. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-12">
        <div className="relative mx-auto h-[420px] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          {HERO_LOOP.map((shot, i) => (
            <div
              key={shot.image}
              className={`${i === 0 ? "animate-hero-crossfade-first" : "animate-hero-crossfade"} absolute inset-0 flex items-center justify-center p-6`}
              style={{
                // Shared total duration for every image (see
                // HERO_TOTAL_LOOP_SECONDS above) so the loop stays in sync
                // even though index 0 uses a different keyframe shape.
                animationDuration: `${HERO_TOTAL_LOOP_SECONDS}s`,
                // Positive delay (2026-08-12 fix, direct report: "out of
                // sequence"). The crossfade keyframe's visible window sits
                // near the START of its own local cycle (see globals.css's
                // hero-crossfade: opaque at 8%-26%). A NEGATIVE delay makes
                // an element act as though its animation already ran for
                // that long before t=0 -- i.e. it fast-forwards INTO the
                // cycle -- so a larger negative offset (higher i) reaches
                // its visible window SOONER in wall-clock time, not later.
                // That inverted the order to roughly 1,0,3,2 instead of the
                // intended 0,1,2,3. A positive delay pushes the start
                // later instead, which is what staggering images in
                // ascending order actually requires.
                //
                // index 0 (Sign) always starts at 0s -- direct ask
                // 2026-08-12, "start on the signing hero." The other three
                // keep their original stagger (computed from the unchanged
                // HERO_LOOP_SECONDS, not the new total) but shift later by
                // HERO_FIRST_HOLD_EXTRA_SECONDS to make room for Sign's
                // longer hold.
                animationDelay:
                  i === 0 ? "0s" : `${(i * HERO_LOOP_SECONDS) / HERO_LOOP.length + HERO_FIRST_HOLD_EXTRA_SECONDS}s`,
              }}
            >
              <Image
                src={shot.image}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                sizes="(min-width: 640px) 36rem, 92vw"
                className="max-h-full w-auto rounded-lg object-contain shadow-lg"
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">Real product output — Sign, Seal, Quote, Draft.</p>
      </section>

      {/* Screenshot-paired "why SignedBy" — Aracor's 6-reasons pattern,
          done here as exactly the product's own 4 pillars (Sign/Seal/Quote/
          Draft, same order and icons as the dashboard's own tab picker —
          see the file comment above). Alternating image side on desktop
          (odd rows flip) so the section doesn't read as a flat repeating
          list; text stacks ABOVE the image on mobile (badge+heading+copy
          first in the DOM, image second) — same pattern as
          DeveloperApiSection below, fixed 2026-08-12 (direct report: image
          was sitting above the badge/intro text on mobile, inconsistent
          with the Developers section). Row/row-reverse is flipped from a
          naive image-first reading of "even = row" because the DOM order
          swapped: text-first + sm:flex-row-reverse now produces the same
          image-left/text-right desktop layout the old image-first +
          sm:flex-row markup did, and vice versa for odd rows. */}
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">Why SignedBy</h2>
        <div className="flex flex-col gap-16">
          {REASONS.map((r, i) => (
            <div key={r.title} className={`flex flex-col items-center gap-8 sm:gap-10 ${i % 2 === 1 ? "sm:flex-row" : "sm:flex-row-reverse"}`}>
              <div className="max-w-sm text-center sm:text-left">
                <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-900 sm:justify-start">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-300 text-slate-900">
                    <r.Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  {r.title}
                </h3>
                <p className="mt-2 text-slate-600">{r.description}</p>
              </div>
              <div className="w-full max-w-sm shrink-0 overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
                <Image
                  src={r.image}
                  alt={r.alt}
                  width={r.width}
                  height={r.height}
                  sizes="(min-width: 640px) 24rem, 90vw"
                  className="h-auto w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {showDeveloperSection && <DeveloperApiSection />}

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">Trusted by</p>
        <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-logo-marquee flex w-max items-center gap-12">
            {[...TRUSTED_BY, ...TRUSTED_BY].map((logo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${logo.name}-${i}`}
                src={logo.src}
                alt={logo.name}
                className={`${logo.height} w-auto shrink-0 opacity-40 grayscale transition-opacity hover:opacity-70`}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            EU-based company
          </span>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            GDPR-compliant · EEA data residency
          </Link>
          {/* Third pill added 2026-08-12 to match the live homepage — this
              preview had fallen one pill behind (see
              HOMEPAGE_HERO_VIDEO_AND_SECOND_HALF_SCOPE.md). */}
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            AI never trains on your documents
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Simple pricing</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRICING.map((p) => (
            <Card key={p.name} className="text-center">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatPrice(currency, p.id, { withPeriod: true })}
                </p>
                <p className="mt-2 text-xs text-slate-500">{p.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            See full plan details →
          </Link>
        </p>
      </section>
    </>
  );
}
