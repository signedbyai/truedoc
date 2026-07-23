import { dedupe, flag } from "flags/next";

// CTA color test — see marketing/cta-color-test.md for the write-up.
//
// Deliberately cookieless: `identify` derives a bucket from the request's
// own IP + User-Agent headers, never sets or reads a cookie, and nothing is
// written to localStorage client-side. Same privacy posture as Vercel Web
// Analytics itself (documented as "cookieless" where it's mounted in
// layout.tsx). The tradeoff: a visitor's color can shift across sessions if
// their IP changes (new network, VPN), which a cookie wouldn't have — an
// accepted cost for staying cookieless.
// Started as yellow/blue/black (2026-07-23), narrowed to yellow/blue the
// same day over signal-dilution concerns, then reverted back to a 3-way
// concurrent split on 2026-07-23 -- black swapped for purple -- after
// deciding a chain of sequential 2-way rounds (yellow/blue -> winner/
// purple -> winner/black) was a worse tradeoff: comparing week-over-week
// winners isn't a clean comparison, since traffic mix/campaigns/season
// change between rounds too, not just the color. A concurrent 3-way split
// is slower to reach significance but isn't confounded by time. See
// marketing/cta-color-test.md for the full history.
export const CTA_COLORS = ["yellow", "blue", "purple"] as const;
export type CtaColor = (typeof CTA_COLORS)[number];

// Small non-cryptographic string hash (djb2 variant) — pure JS, no
// node:crypto, so this runs fine in either the Node or Edge runtime.
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

const identify = dedupe(async (params: { headers: Headers; cookies: unknown }) => {
  const { headers } = params;
  const forwardedFor = headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  const userAgent = headers.get("user-agent") ?? "unknown";
  return { visitorKey: `${ip}|${userAgent}` };
});

export const ctaColorFlag = flag<CtaColor>({
  key: "cta-color",
  identify,
  decide({ entities }) {
    const key = entities?.visitorKey ?? "anonymous";
    const bucket = hashString(key) % CTA_COLORS.length;
    return CTA_COLORS[bucket];
  },
  defaultValue: "yellow",
  description: "Marketing CTA button color test: yellow (current) vs blue vs purple, all concurrent.",
  options: CTA_COLORS.map((value) => ({ value })),
});
