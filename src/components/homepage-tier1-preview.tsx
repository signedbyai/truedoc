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
  // Hero-slide zoom target, 2026-08-12 direct ask: "on the Invoice do
  // some zoom in on the QR code, on the Quote zoom in on the yellow
  // generate you quote button, and on the draft zoom in on the yellow
  // generate draft button." A CSS transform-origin percentage pair, NOT
  // eyeballed -- each one was measured directly against the actual
  // public/ image file: Seal's QR via opencv's QRCodeDetector (the wax
  // seal medallion elsewhere in that same image is itself circular/
  // patterned enough to false-positive as a QR, so detection was run on
  // just the bottom half of the image to isolate the real one); Quote's
  // button from scripts/fix-hero-magic-quote-button.py's own
  // BTN_MARGIN_X/BTN_HEIGHT/BTN_BOTTOM_PAD constants (that script drew
  // the button, so its coordinates are exact, not estimated); Draft's
  // button by scanning hero-new-document-draft.png for its dense
  // yellow-pixel region (that image is a real screenshot, not a
  // generated one, so there's no source script with coordinates to read
  // -- the scanned button height, 39px in a 513px-tall image, matches
  // the exact figure already cited elsewhere in this file for that same
  // real button, cross-confirming the scan found the right region).
  // Sign's was already established in an earlier pass (its swipe
  // button, scanned from hero-sign-mobile-composite.png).
  zoomOrigin: string;
  // 2026-08-12, seventh pass, direct report: "the seal on the top right
  // of the invoice heads out of the screen the top right" -- Seal's
  // zoomOrigin used to sit down near the QR code (bottom half of the
  // image), so scaling toward it dragged the OPPOSITE corner -- the
  // top-right, where the actual medallion is stamped -- outward past the
  // frame edge as the zoom progressed. Temporarily fixed by opting Seal
  // out of the zoom entirely (noZoom). Re-enabled eighth pass, direct
  // ask: "turn on the seal zoom again, but it has to be pushed out toward
  // the bottom left if it is to work" -- re-anchored zoomOrigin ON the
  // medallion itself (see Seal's own zoomOrigin comment below) instead of
  // the QR code, so the seal is what stays fixed/framed as the zoom
  // progresses, and everything far from that origin -- the QR code, the
  // line items, the rest of the invoice -- is what gets pushed out toward
  // the bottom-left edge instead. noZoom kept as an optional escape hatch
  // for any future reason that can't find a working origin.
  noZoom?: boolean;
}[] = [
  {
    title: "Sign",
    description: "Place signature, initials, date, and text fields on any PDF, then send for signature in seconds.",
    image: "/hero-sign-mobile-composite.png",
    alt: "The SignedBy field editor with the mobile signing screen overlaid, showing the Slide to sign & submit control",
    width: 1642,
    height: 1070,
    Icon: Signature,
    zoomOrigin: "83% 90%",
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
    // Re-measured against generate-hero-verified-badge-invoice-d.tsx's own
    // layout constants, not eyeballed -- that script places the seal
    // medallion centered exactly on the invoice card's own top-right
    // corner point, which its own comment gives as canvas coordinates
    // (600, cardTop=140) on this image's 740x650 canvas (40px left/
    // OUTER_PAD_TOP=140px top padding + a 560px-wide card + the seal's own
    // top:-120/right:-120 placement centering it on that corner --
    // (40+560, 140) = (600, 140)). As a percentage of the 740x650 canvas:
    // 600/740 = 81.1%, 140/650 = 21.5%. Anchoring the zoom here keeps the
    // medallion itself fixed/framed as the image scales up; everything
    // else (QR code, line items) is far from this top-right-ish point and
    // gets pushed out toward the bottom-left instead, per the ask.
    zoomOrigin: "81.1% 21.5%",
  },
  {
    title: "Quote",
    description: "Describe the job in plain language and Magic Quote turns it into a signable, itemized quote.",
    image: "/hero-magic-quote.png",
    alt: "The Magic Quote itemized editor: quote title, currency, bill-to, and line items with computed totals",
    width: 568,
    height: 483,
    Icon: Receipt,
    zoomOrigin: "50% 89.3%",
  },
  {
    title: "Draft",
    description: "Describe what you need and AI drafts a ready-to-send agreement — review, edit, and send in the same flow.",
    image: "/hero-new-document-draft.png",
    alt: "The Draft tab: document type and language pickers, a plain-language description, and a Generate draft button",
    width: 567,
    height: 513,
    Icon: Sparkles,
    zoomOrigin: "49.3% 91.3%",
  },
];

// The hero crossfade, 2026-08-12 reorder (direct ask): a new first slide
// -- a row of all four Sign/Seal/Quote/Draft badges with their labels,
// establishing the four pillars up front -- followed by the four real
// screenshots in that same order, then loops. HeroLoopItem is a
// discriminated union (no "reason" key = the intro slide) so the render
// below can branch on `"reason" in item` instead of juggling magic
// indices.
type HeroLoopItem = { key: string } & ({ reason?: undefined } | { reason: (typeof REASONS)[number] });

const HERO_LOOP: HeroLoopItem[] = [{ key: "intro" }, ...REASONS.map((r) => ({ key: r.image, reason: r }))];

// Timing, 2026-08-12 direct report: "the 4 badges come in too soon at
// the end of the loop so they pop in behind the last image, needs
// another second." Root cause: when the intro badge slide was added as
// a 5th HERO_LOOP entry, the per-image delay spacing below was (bug)
// computed as a fraction of HERO_LOOP.length (now 5) instead of the
// fixed count of REAL images (still 4) -- so adding a 5th array entry
// silently squeezed the four screenshots' spacing tighter without
// anyone asking for that, on top of a pre-existing timing issue this
// exposed: the last image's own fade-out (which, per globals.css's
// hero-crossfade keyframe, ends at local 30% of whatever duration is
// given) needs to actually finish, with room to spare, before the loop
// wraps and the intro slide reappears -- intro uses
// hero-crossfade-first, which snaps straight to opaque at its own local
// 0% with no fade-in, so if the previous slide hasn't fully faded out
// yet, the intro row pops in already fully visible but hidden behind
// whatever's still on top of it, then only becomes visible once that
// slide's fade-out catches up -- reading as a sudden "pop" instead of a
// dissolve. HERO_IMAGE_COUNT (4, the fixed number of real screenshots)
// replaces HERO_LOOP.length as the spacing divisor, restoring the
// original 3-seconds-apart stagger; HERO_TOTAL_LOOP_SECONDS was solved
// for directly rather than left as a fixed +1 offset, so it's
// guaranteed to satisfy the "another second" ask: Draft (the last
// image) starts at delay 13s and its own fade-out ends at
// 13 + 0.3 * 20 = 19s, one full second before the 20s loop wraps.
// 2026-08-12, sixth pass, direct ask: "leave a little bit more time
// between the transitions and the [Draft] image" -- the Draft slide (the
// last one before the loop wraps) was reaching its own transition too
// soon after Quote's. HERO_LOOP_SECONDS raised 12 -> 14 (step 3s -> 3.5s
// apart), pushing every image's delay back a bit and Draft's specifically
// from 13s to 15s. HERO_TOTAL_LOOP_SECONDS re-solved the same way the
// previous pass derived it (not left as a stale +1 offset): Draft's own
// fade-out ends at delay + 0.3 * duration, and this should land with
// about a second of buffer before the loop wraps back to the intro slide
// -- 15 + 0.3*23 = 21.9s, leaving 1.1s before the 23s wrap (was 13 + 0.3*20
// = 19s / 1s buffer on the old numbers). The larger duration also
// stretches every slide's own fade-in/hold/fade-out proportionally (all
// keyframe timings are percentages of duration), so each image now holds
// fully visible ~0.5s longer too, not just Draft.
//
// 2026-08-12, eighth pass, direct ask: "wait a bit more before the
// transition to the next image on each animation turn, just another
// second." Read as a per-transition ask, not a Draft-only one this time
// -- every hop (intro->Sign, Sign->Seal, Seal->Quote, Quote->Draft)
// should wait 1s longer than it currently does before starting the next
// image's fade-in. HERO_IMAGE_STEP_SECONDS is the delta between one
// slide's delay and the next, so +1s there does exactly that: raised
// 3.5 -> 4.5 (HERO_LOOP_SECONDS 14 -> 18). Because delay is
// i * HERO_IMAGE_STEP_SECONDS, this compounds by index -- Sign (i=1) is
// 1s later than before, Seal (i=2) 2s later, Quote (i=3) 3s later, Draft
// (i=4) 4s later -- which is correct: each of the four transitions
// individually got the same 1s-longer wait, so by the last one the
// cumulative shift is 4s. HERO_TOTAL_LOOP_SECONDS re-solved again the
// same way: Draft's delay is now 4*4.5 + 1 = 19s; 19 + 0.3*29 = 27.7s,
// leaving 1.3s of buffer before the 29s loop wraps back to the intro
// slide (same ~1s-plus-a-bit buffer this constant has been solved for
// every prior pass).
// 2026-08-12, eleventh pass, direct report: "the invoice, quote and draft
// transitions arrive too fast and land on top of the old image" (Sign was
// fine). Root cause, worked out against globals.css's hero-crossfade
// keyframe (opaque 8%-26%, fades out 26%-30% of its own local cycle):
// at HERO_IMAGE_STEP_SECONDS=4.5s and HERO_TOTAL_LOOP_SECONDS=29s, an
// incoming slide finished fading fully IN about 0.72s before the outgoing
// slide even started fading out -- so for that 0.72s both sat at opacity
// 1 simultaneously, and since later slides paint over earlier ones (no
// z-index, just DOM order), the incoming one visibly sat on top of a
// still-fully-opaque outgoing one instead of dissolving into it. This
// only affects Sign->Seal/Seal->Quote/Quote->Draft (all three share the
// same .animate-hero-crossfade keyframe and step spacing); intro->Sign
// uses the separate, longer-holding hero-crossfade-first keyframe and
// wasn't reported as a problem, so it's deliberately left alone here.
// Direct ask, simplified: "just add a second before invoice, quote and
// draft start animating." HERO_LATE_TRANSITION_EXTRA_SECONDS adds that
// 1s to each of the three late gaps specifically (not intro->Sign),
// closing the 0.72s deficit with a small margin to spare. Paired with a
// 26%->25% / 30%->29% trim on hero-crossfade's own hold/fade-out marks
// (globals.css) to close the gap the rest of the way to (near) zero
// overlap, rather than leaving a smaller-but-still-present one.
// HERO_TOTAL_LOOP_SECONDS raised 29->32 so Draft (now delayed further)
// still finishes fading out with a buffer before the loop wraps --
// Draft's delay is 22s (4*4.5 + 1 + 3*1 late-extra); fade-out ends at
// 22 + 0.29*32 = 31.28s, 0.72s before the 32s wrap.
const HERO_IMAGE_COUNT = 4;
const HERO_LOOP_SECONDS = 18;
const HERO_IMAGE_STEP_SECONDS = HERO_LOOP_SECONDS / HERO_IMAGE_COUNT; // 4.5s apart
// Hold on the intro badge row before the first image's delay begins —
// see globals.css's .animate-hero-crossfade-first for the other half of
// this (opaque from 0% instead of fading in).
const HERO_FIRST_HOLD_EXTRA_SECONDS = 1;
// Extra second added to each of the Sign->Seal/Seal->Quote/Quote->Draft
// gaps specifically -- see this block's own comment above. Not applied to
// intro->Sign (i=1).
const HERO_LATE_TRANSITION_EXTRA_SECONDS = 1;
const HERO_TOTAL_LOOP_SECONDS = 32;

// New first slide, 2026-08-12 direct ask: "an image of the 4 badges in a
// row Sign, Seal, Quote, Draft with the word under each badge." Not a
// generated image -- the exact same yellow-badge + lucide-icon markup the
// reasons row below already uses (see the r.Icon span further down),
// reused here at a larger size, so this establishing slide shares one
// visual vocabulary with the rest of the page rather than introducing a
// new graphic style or another generated PNG.
// 2026-08-12, twelfth pass, direct report (mobile screenshot attached):
// on a real phone (~375-390px viewport) the row of 4 badges wrapped --
// Sign/Seal/Quote on one line, Draft alone on a second. Root cause: the
// available width inside this card is viewport minus 96px (48px from the
// section's own px-6, another 48px from the crossfade slide's own p-6),
// so at 375px that's only 279px to fit 4 badges in -- at the old 56px
// badge size + 36px gap (gap-9), 4 of them need 224+108=332px, well over
// budget. Asked to either stop the wrap or tighten the spacing,
// "whichever is better" -- tightening wins here: forcing flex-nowrap
// without also shrinking things would just clip the badges off-screen
// instead of wrapping them, which is worse. Mobile badge size dropped
// 56px->48px (h-14->h-12) and gap dropped 36px->16px (gap-9->gap-4): 4
// badges now need 192+48=240px, comfortably under budget even on a
// 360px-wide phone (264px available). sm: sizes (larger screens, where
// this never wrapped) are untouched.
function IntroBadgeRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-14">
      {REASONS.map((r) => (
        <div key={r.title} className="flex flex-col items-center gap-2.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300 text-slate-900 sm:h-16 sm:w-16">
            <r.Icon className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={1.5} />
          </span>
          <span className="text-sm font-semibold text-slate-900 sm:text-base">{r.title}</span>
        </div>
      ))}
    </div>
  );
}

// Small yellow icon badge pinned to a hero slide's own OUTER wrapper --
// direct ask 2026-08-12: "keep the badge for the relevant animation in
// the top right" (moved to top LEFT same day, direct follow-up). Rendered
// as a sibling of the slide's image content in the crossfade map below,
// not nested inside HeroImageContent's zooming box -- nesting it in
// there would have scaled and dragged the badge along with the image
// toward the zoom's own transform-origin. As a sibling of the (non-zooming,
// only-opacity-animated) outer slide div, it stays fixed in the corner
// regardless of what the content underneath is doing.
function FeatureCornerBadge({ Icon }: { Icon: typeof Signature }) {
  return (
    <span className="pointer-events-none absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-300 text-slate-900 shadow-sm sm:left-4 sm:top-4">
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

// Hero slide image content, shared by all four Sign/Seal/Quote/Draft
// slides. Wraps the real screenshot in a sized box (aspect-ratio +
// h-full/max-w-full, so it shrink-to-fits the crossfade card exactly
// like a plain <Image> would) and slowly zooms toward that reason's own
// zoomOrigin (see REASONS' own comment for how each origin was
// measured).
//
// Fixed 2026-08-12 (direct report: "the animation ... is not working" --
// nothing was rendering at all, not just failing to animate). Root
// cause: this box originally used `max-h-full max-w-full` with no actual
// width/height, only caps. Its only child was `position: absolute` (the
// fill Image), which doesn't contribute to a parent's auto content size
// -- so with no definite width, no definite height, and no content-based
// size to fall back to, aspect-ratio had nothing to compute from and the
// whole box collapsed to 0x0. `h-full` (definite, resolves against the
// flex parent's real pixel height) gives aspect-ratio a real seed to
// derive width from; `max-w-full` still clamps it, and per the CSS
// sizing spec that clamp correctly recomputes height back down through
// the same ratio rather than just cropping.
//
// 2026-08-12: dropped a sliding swipe-thumb overlay that used to sit on
// top of Sign's image (direct report: "not probably aligned and the
// starting button is still visible underneath"). Left as a plain zoom
// on the real screenshot -- a later revisit, not abandoned. The real
// button-track measurements (scanned from hero-sign-mobile-composite.png's
// actual pixels): track x[1122,1620] y[929,995] of the 1642x1070
// composite, knob x[1122,1217] same y (95px wide, 19.1% of track width).
//
// 2026-08-12: the zoom, originally Sign-only (its own SignHeroContent
// component, "animate to a zoom of the signer experience"), was
// extended to Seal/Quote/Draft the same day per direct ask ("zoom in on
// the QR code" / "the generate your quote button" / "the generate draft
// button") and merged into this one shared component -- all four now
// use the identical mechanism, just a different zoomOrigin each.
// delaySeconds (passed down from the crossfade map below, the same
// value given to this slide's own outer div) keeps the zoom's local 0%
// in sync with the outer div's fade timing -- without it the zoom would
// run on its own unsynced clock starting at page load, out of phase
// with when the image is actually visible. globals.css's
// .animate-hero-zoom keyframe is timed to match every slide's shared
// .animate-hero-crossfade window: scale(1) through 4% (fade-in start),
// reaching scale(1.28) by 26% (end of the opaque hold, matching
// hero-crossfade's own 26% opaque-to-fade-out boundary) so the zoom
// finishes right as the image is fully visible rather than mid-fade.
//
// 2026-08-12: Seal opts out via noZoom (see REASONS' own comment -- its
// zoomOrigin sits near the bottom QR code, so scaling toward it pushed
// the medallion in the opposite/top-right corner out of frame). When
// noZoom is set, this renders the same sized box with no animation class
// and no animation-* style props at all, so the image just sits static
// at scale(1) instead of running the zoom keyframe.
function HeroImageContent({ reason, delaySeconds }: { reason: (typeof REASONS)[number]; delaySeconds: number }) {
  return (
    <div
      className={`relative h-full w-auto max-w-full ${reason.noZoom ? "" : "animate-hero-zoom"}`}
      style={{
        aspectRatio: `${reason.width} / ${reason.height}`,
        transformOrigin: reason.zoomOrigin,
        ...(reason.noZoom
          ? {}
          : {
              animationDuration: `${HERO_TOTAL_LOOP_SECONDS}s`,
              animationDelay: `${delaySeconds}s`,
            }),
      }}
    >
      <Image
        src={reason.image}
        alt={reason.alt}
        fill
        sizes="(min-width: 640px) 36rem, 92vw"
        className="rounded-lg object-contain shadow-lg"
      />
    </div>
  );
}

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
    // max-w-4xl -- 2026-08-12 direct report: "the text placement, either
    // the developers text placement is correct and the others are wrong
    // or the other way around, but make it consistent" (only visible
    // once the viewport is stretched past ~896px, confirmed live).
    // This section was max-w-5xl (1024px) while the reasons/Why-SignedBy
    // section above it is max-w-4xl (896px) -- both are independently
    // mx-auto-centered, so below 896px they're both simply clamped to
    // the viewport and line up by coincidence, but past 896px the
    // narrower section stops growing while this one keeps growing to
    // 1024px, so their left edges (and therefore this section's
    // badge+heading) drift right of the reasons row's badge+heading
    // above it. Matched to max-w-4xl so both sections share the exact
    // same centered width for every viewport width, not just narrow ones.
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
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
            {/* text-lg, not text-2xl -- 2026-08-12 direct report: "the
                font size...looks slightly different, or perhaps its just
                larger." Checked live (getComputedStyle on the deployed
                page): text-2xl here WAS byte-for-byte identical to the
                "Why SignedBy"/"Simple pricing" section headers (24px/600/
                same font stack) -- no CSS bug against THOSE. But per the
                screenshot Michael sent, this block sits directly under
                the Draft card and visually reads as a 5th pillar (badge +
                bold word + description, identical shape to Sign/Seal/
                Quote/Draft's own h3 pattern below), not as a standalone
                section title the way "Why SignedBy" is -- so the correct
                comparison is against THOSE titles (text-lg, 18px), which
                this genuinely was larger than. Dropped to match. Copy
                changed from "Built for developers" to "Wire in your CRM"
                per direct ask, same day. */}
            <h2 className="text-lg font-semibold text-slate-900">Wire in your CRM</h2>
          </div>
          {/* mx-auto sm:mx-0 -- direct report: this box wasn't aligned like
              the reason cards above it. Text-align:center alone only
              centers the TEXT inside a box, not the box itself; the
              reasons row gets that for free from its parent's flex
              items-center, but this section's mobile layout is a single-
              column CSS grid (no items-center-equivalent), so this
              max-w-sm box sat flush-left with centered text inside it --
              a visibly different rhythm than the fully-centered reason
              cards. mx-auto centers the box itself to match; sm:mx-0
              reverts to flush-left on desktop, where the section is
              already text-left via the parent. Also dropped "Starts
              metered on Pro, fully unlimited on Business" per direct ask. */}
          <p className="mx-auto max-w-sm text-slate-600 sm:mx-0 sm:max-w-none">
            A REST API and outbound webhooks — create and send documents from your CRM, poll status, or get
            notified the moment something&apos;s signed.
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

      {/* The "hero video" — a looping crossfade of real screenshots (plus
          one intro badge-row slide) in one fixed-size card rather than an
          actual recorded clip (see the file comment above and
          globals.css's .animate-hero-crossfade). A neutral bg-slate-50
          card with object-contain lets the different shapes (badge row,
          field editor landscape, the square seal, the tall Quote panel,
          the Draft mockup) share one frame without any of them looking
          cropped or stretched. Duration and per-slide delay both derive
          from HERO_LOOP_SECONDS / HERO_LOOP.length so adding/removing a
          slide doesn't require re-tuning the timing by hand.
          prefers-reduced-motion isn't special-cased: the crossfade is a
          slow opacity fade, not motion/parallax, so it doesn't trigger
          the concerns that setting exists for. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-12">
        <div className="relative mx-auto h-[420px] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          {HERO_LOOP.map((item, i) => {
            // Positive delay (2026-08-12 fix, direct report: "out of
            // sequence"). The crossfade keyframe's visible window sits
            // near the START of its own local cycle (see globals.css's
            // hero-crossfade: opaque at 8%-26%). A NEGATIVE delay makes an
            // element act as though its animation already ran for that
            // long before t=0 -- i.e. it fast-forwards INTO the cycle --
            // so a larger negative offset (higher i) reaches its visible
            // window SOONER in wall-clock time, not later. A positive
            // delay pushes the start later instead, which is what
            // staggering slides in ascending order actually requires.
            //
            // index 0 (the intro badge row) always starts at 0s. Each
            // image's delay is i * HERO_IMAGE_STEP_SECONDS (i=1..4, so
            // 4.5s apart -- see HERO_IMAGE_STEP_SECONDS's own comment for
            // why i isn't divided across HERO_LOOP.length) plus the flat
            // HERO_FIRST_HOLD_EXTRA_SECONDS hold before the first image,
            // plus HERO_LATE_TRANSITION_EXTRA_SECONDS once per gap AFTER
            // Sign (i.e. (i-1) times for i>=2 -- Seal gets +1s, Quote +2s,
            // Draft +3s -- see that constant's own comment for why Sign
            // itself, i=1, is excluded).
            const lateExtra = i >= 2 ? (i - 1) * HERO_LATE_TRANSITION_EXTRA_SECONDS : 0;
            const delaySeconds = i === 0 ? 0 : i * HERO_IMAGE_STEP_SECONDS + HERO_FIRST_HOLD_EXTRA_SECONDS + lateExtra;
            return (
              <div
                key={item.key}
                className={`${i === 0 ? "animate-hero-crossfade-first" : "animate-hero-crossfade"} absolute inset-0 flex items-center justify-center p-6`}
                style={{
                  // Shared total duration for every slide (see
                  // HERO_TOTAL_LOOP_SECONDS above) so the loop stays in
                  // sync even though index 0 uses a different keyframe
                  // shape.
                  animationDuration: `${HERO_TOTAL_LOOP_SECONDS}s`,
                  animationDelay: `${delaySeconds}s`,
                }}
              >
                {!item.reason ? <IntroBadgeRow /> : <HeroImageContent reason={item.reason} delaySeconds={delaySeconds} />}
                {/* Corner badge (top left, moved from top right same day) --
                    skipped on the intro slide itself, which already shows
                    all four badges. */}
                {item.reason && <FeatureCornerBadge Icon={item.reason.Icon} />}
              </div>
            );
          })}
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
          DeveloperApiSection below.

          2026-08-12, tenth pass, direct report: "the left side of the API
          animation is now not lined up" -- once the images were widened
          (ninth pass, max-w-sm -> max-w-lg), this section's rows and
          DeveloperApiSection below no longer agreed on where the
          left/right column boundary sits. Root cause: they were built on
          two different layout mechanisms that only happened to look
          aligned by coincidence at the OLD width. This row used a plain
          flex row (text auto-width, image capped at max-w-lg) with no
          shared column grid; DeveloperApiSection uses a real
          `sm:grid-cols-2` grid (two exact 404px columns on this section's
          848px content width). At the old max-w-sm image width there was
          enough slack that the flex row's packed layout landed close to
          where the grid's column boundary was, close enough not to
          notice; at max-w-lg the flex row's text column has to shrink
          below max-w-sm to fit, which shifts the image well further left
          than the grid's fixed 404px column start -- a ~108px gap,
          confirmed by direct pixel math against both layouts.

          Fixed by switching this row to the SAME sm:grid-cols-2 gap-10
          grid DeveloperApiSection uses, instead of matching pixel widths
          by hand (fragile, breaks again the next time either section's
          width changes). DOM order stays text-first/image-second on every
          row (unchanged, still the mobile stacking order); sm:order-1/
          sm:order-2 handle the alternating desktop side instead of
          flex-row/flex-row-reverse. This also settles the image's actual
          rendered width at ~404px (the grid column width) rather than the
          max-w-lg cap of 512px -- still visibly larger than the original
          384px, and now structurally guaranteed to line up with the API
          panel's column at every viewport width, not just one. */}
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">Why SignedBy</h2>
        <div className="flex flex-col gap-16">
          {REASONS.map((r, i) => (
            <div key={r.title} className="grid gap-8 sm:grid-cols-2 sm:items-center sm:gap-10">
              <div className={`text-center sm:text-left ${i % 2 === 1 ? "sm:order-1" : "sm:order-2"}`}>
                <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-900 sm:justify-start">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-300 text-slate-900">
                    <r.Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  {r.title}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-slate-600 sm:mx-0 sm:max-w-none">{r.description}</p>
              </div>
              <div
                className={`overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] ${i % 2 === 1 ? "sm:order-2" : "sm:order-1"}`}
              >
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
