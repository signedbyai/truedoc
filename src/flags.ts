import { flag } from "flags/next";

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
