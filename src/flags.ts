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

// "Upload & continue" button color test — concluded 2026-08-05, direct ask,
// same day the Sign/Seal uploader redesign made both buttons this flag ever
// applied to permanently yellow (borrowed from Console's own uploader).
// There's no "black" left anywhere for the flag to select, so it's retired
// rather than left resolving to a variant nothing reads. See git history for
// the original test setup/reasoning if this ever needs resurrecting.
