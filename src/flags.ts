import { dedupe, flag } from "flags/next";

// CTA color test — concluded 2026-07-24. See marketing/cta-color-test.md
// for the full history and results.
//
// 30-day result: purple clearly won. Of 135 flag exposures split roughly
// evenly across yellow/blue/purple, purple (68 exposures) drove 13 of the
// 14 total cta_click events (~19% CTR) vs blue's 1 click (~3% CTR) and
// yellow's 0 clicks. Locked to purple below; the flag is kept (rather than
// deleted) so FlagValues exposure tracking and the color-class plumbing in
// cta-link.tsx don't need to change, and so we can easily spin up a new
// challenger test later without re-wiring anything.
export const CTA_COLORS = ["yellow", "blue", "purple"] as const;
export type CtaColor = (typeof CTA_COLORS)[number];

export const ctaColorFlag = flag<CtaColor>({
  key: "cta-color",
  decide() {
    return "purple";
  },
  defaultValue: "purple",
  description: "Marketing CTA button color — locked to purple after the yellow/blue/purple test concluded 2026-07-24.",
  options: CTA_COLORS.map((value) => ({ value })),
});

// Small non-cryptographic string hash (djb2 variant) — pure JS, no
// node:crypto, so this runs fine in either the Node or Edge runtime. Same
// implementation the (now-concluded) CTA color test used — see git history
// on this file (acd1b52) if that one is ever needed again too. Currently
// unused while the homepage layout test below is paused (2026-07-27) — kept
// rather than deleted since resuming that test needs it back immediately.
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Shared visitor-bucketing identity: derives a stable-per-request key from
// the request's own IP + User-Agent headers. dedupe() means every flag that
// calls this within the same request shares one computed value instead of
// re-deriving it — relevant now that homepageVariantFlag below uses it too.
const identify = dedupe(async (params: { headers: Headers; cookies: unknown }) => {
  const { headers } = params;
  const forwardedFor = params.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  const userAgent = headers.get("user-agent") ?? "unknown";
  return { visitorKey: `${ip}|${userAgent}` };
});

// Homepage layout test — started 2026-07-25. See
// marketing/homepage-layout-test.md for the full write-up.
//
// "current" is the live centred single-column hero (product shot below the
// fold). "v20" restores the two-column left-aligned layout that had been
// kept on the dev branch as a preview (product shot above the fold,
// alongside the copy) — see homepage-versions/INDEX.md's v20/v21 entries
// for how the two diverged. Both variants now live as real components on
// every branch; dev's page.tsx is no longer a separate preview.
//
// Deliberately cookieless, same posture and same accepted tradeoff as the
// CTA color test (a visitor's variant can shift if their IP changes
// mid-visit) — chosen over cookie-based sticky bucketing to keep the same
// methodology as that test, at Michael's explicit direction.
export const HOMEPAGE_VARIANTS = ["current", "v20"] as const;
export type HomepageVariant = (typeof HOMEPAGE_VARIANTS)[number];

export const homepageVariantFlag = flag<HomepageVariant>({
  key: "homepage-variant",
  identify,
  decide() {
    // PAUSED 2026-07-27 — always "current" for everyone. Original
    // hash-bucket split commented out below (not deleted) so the test can
    // resume by uncommenting + removing this early return, rather than
    // rebuilding the bucketing logic from scratch.
    return "current";
    // decide({ entities }) {
    //   const key = entities?.visitorKey ?? "anonymous";
    //   const bucket = hashString(key) % HOMEPAGE_VARIANTS.length;
    //   return HOMEPAGE_VARIANTS[bucket];
    // }
  },
  defaultValue: "current",
  description:
    "Homepage layout test: current centred single-column hero vs the v20 two-column layout (product shot above the fold) previously kept on dev as a preview. PAUSED 2026-07-27 — decide() short-circuits to \"current\" for everyone.",
  options: HOMEPAGE_VARIANTS.map((value) => ({ value })),
});

// Console empty-state hero icon color test — started 2026-08-04. See
// CONSOLE_VERIFIED_BADGE_FOCUS_REDESIGN_SCOPE.md for the full write-up:
// a dark-navy square with a light-blue shield-check icon vs. the brand
// yellow square with a navy icon, tested to see which one gets more
// traction before locking one in — same "see which one gets more
// traction" framing as the concluded CTA color test above, so it gets
// the same treatment: a real flag, cookieless, hash-bucketed, not a
// subjective pick. Measured against upload-start (see
// console-chat.tsx's sealSelectedFile, which fires a
// "console_upload_started" analytics event carrying this variant),
// not a page view — the whole point of this redesign is getting someone
// to upload immediately, not just look at the hero.
export const CONSOLE_HERO_ICON_COLORS = ["blue", "yellow"] as const;
export type ConsoleHeroIconColor = (typeof CONSOLE_HERO_ICON_COLORS)[number];

export const consoleHeroIconFlag = flag<ConsoleHeroIconColor>({
  key: "console-hero-icon-color",
  identify,
  decide({ entities }) {
    const key = entities?.visitorKey ?? "anonymous";
    const bucket = hashString(key) % CONSOLE_HERO_ICON_COLORS.length;
    return CONSOLE_HERO_ICON_COLORS[bucket];
  },
  defaultValue: "blue",
  description: "Console empty-state hero icon color test: blue badge icon vs. yellow, measured against upload-start rate.",
  options: CONSOLE_HERO_ICON_COLORS.map((value) => ({ value })),
});

// Verified Badge invoice page — pill + CTA copy test, started 2026-08-09,
// widened from 3 to 6 variants same day. See
// marketing/verified-badge-invoice-cta-test.md for the full write-up.
// Concurrent split, same methodology as the concluded cta-color test above:
// cookieless, hash-bucketed via the shared identify() visitorKey.
//
// - A (current) — pill "Secure Your Invoice for Free – Verified &
//   Tamper-Evident", button "Get Your Verified Badge Now".
// - B — pill "Secure Your Invoice Now", button "Get Your Verified Badge".
//   Shorter, drops the "Free"/"Tamper-Evident" claims entirely.
// - C — pill "Make a Verified Invoice for Free", button "Verify Your
//   Invoice for Free". Reframes around the action ("make") instead of a
//   security claim.
// - D/E/F added 2026-08-09, direct ask, copy pulled from attached hero-section
//   concept mockups (not built by this app — reference images only):
//   D — pill "Protect Your Invoices and Get Paid", button "Secure Your
//   First Invoice Now". Outcome framing ("get paid"), not just security.
//   E — pill "Seal in Seconds. Protect Always.", button "Start Sealing".
//   Speed/process framing.
//   F — pill "Client Trust, Instantly Verified", button "Seal Your
//   Invoices Now". Framed around the client's experience, not the sender's.
//
// Widening 3->6 was a direct ask, flagged before building: at this page's
// traffic volume a 3-way split was already a slow read (see the doc for
// the cta-color test's own 3-way history), a 6-way split needs
// meaningfully more traffic/time before any variant separates from noise.
// Also still unresolved as of this addition: Vercel Web Analytics is not
// enabled on this project (confirmed via a live API check), so none of
// this — any variant, old or new — is actually queryable yet. See the doc.
//
// Intended to run 1-2 weeks (original ask) then be read the same way as the
// cta-color test: Vercel Analytics, `flags/verified-badge-invoice-cta`
// breakdown cross-referenced with `cta_click` events (CtaLink already
// passes `variant` as a plain event property too, belt-and-suspenders).
// NARROWED TO 2 ARMS 2026-08-13, direct ask. The 6-way split was
// unresolvable at this page's traffic: ~1,200 visitors/week (Vercel Web
// Analytics, 7-day) split six ways is ~200 per arm per week, and picking the
// best of six noisy estimates carries a multiple-comparisons penalty on top.
// Two arms puts ~600/week behind each, which is answerable in weeks rather
// than never.
//
// A and C kept; B, D, E and F dropped from live traffic:
// - A stays as control. It's the only framing that continues the message of
//   the ad actually driving this page's traffic ("Verified Badge - Portrait -
//   Invoice Fraud Angle", 3.585% CTR, the account's best performer), and the
//   A/B/C headline ("AI can fake an invoice in seconds...") names a specific
//   fear rather than the generic trust language D/E/F substitute in.
// - C is the challenger: same visual design, genuinely different copy axis
//   (action framing vs security claim), and carries "for Free" in all three
//   slots.
// - B dropped: removes "for Free" everywhere, which is the strongest single
//   word available to a free-tier product with no card required.
// - D/E/F dropped: each replaces the differentiated headline with
//   interchangeable trust copy, and their visual changes add weight to a page
//   that is 92% mobile with a 78% bounce rate.
//
// Deliberately NOT deleted from the union below — all six stay renderable via
// the ?variant=A..F preview override on the page itself, so nothing has to be
// rebuilt if one is wanted back. Only ACTIVE_VARIANTS gets live traffic.
export const VERIFIED_BADGE_INVOICE_CTA_VARIANTS = ["A", "B", "C", "D", "E", "F"] as const;
export type VerifiedBadgeInvoiceCtaVariant = (typeof VERIFIED_BADGE_INVOICE_CTA_VARIANTS)[number];

// The arms real visitors are bucketed into. Widen or swap here rather than
// touching the union above, which exists for preview/rendering.
const ACTIVE_VARIANTS: readonly VerifiedBadgeInvoiceCtaVariant[] = ["A", "C"];

export const verifiedBadgeInvoiceCtaFlag = flag<VerifiedBadgeInvoiceCtaVariant>({
  key: "verified-badge-invoice-cta",
  identify,
  decide({ entities }) {
    const key = entities?.visitorKey ?? "anonymous";
    const bucket = hashString(key) % ACTIVE_VARIANTS.length;
    return ACTIVE_VARIANTS[bucket];
  },
  defaultValue: "A",
  description:
    "Verified Badge invoice page pill + CTA copy test. Narrowed 2026-08-13 from 6 arms to 2: A (control, security-claim framing) vs C (action framing). B/D/E/F remain renderable via ?variant= but get no live traffic — see the comment above for why each was dropped.",
  options: VERIFIED_BADGE_INVOICE_CTA_VARIANTS.map((value) => ({ value })),
});

// "Upload & continue" button color test — concluded 2026-08-05, direct ask,
// same day the Sign/Seal uploader redesign made both buttons this flag ever
// applied to permanently yellow (borrowed from Console's own uploader).
// There's no "black" left anywhere for the flag to select, so it's retired
// rather than left resolving to a variant nothing reads. See git history for
// the original test setup/reasoning if this ever needs resurrecting.
