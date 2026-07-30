// Content shared by both homepage layout variants (homepage-current.tsx and
// homepage-two-column.tsx, see src/flags.ts's homepageVariantFlag) — the
// two only differ in hero structure and container widths, not in what the
// features/pricing/trusted-by sections say. Factored out here so the two
// variants can't drift out of sync on wording while a layout test is live.

import type { PlanKey } from "@/lib/currency";

export const FEATURES = [
  {
    title: "Drag-and-drop fields",
    description: "Place signature, initials, date, and text fields directly on the PDF in seconds.",
  },
  {
    title: "Multi-signer routing",
    description: "Sequential or parallel signing order, with automatic reminders until it's done.",
  },
  {
    title: "Audit-ready by default",
    description: "Every action is timestamped, hashed, and IP-logged — ESIGN and UETA compliant out of the box.",
  },
  {
    title: "No per-seat tax",
    description: "Flat, transparent pricing built for solo professionals and small teams, not enterprise procurement.",
  },
];

// All real early customers now — every placeholder logo was removed on
// 2026-07-15 (Ironwood Builders, Hartwell Accounting, Crestline Realty,
// Ashcroft Law Group, and the fake Northbridge Capital). Thinq.AI was removed
// 2026-07-15 too. Only add real clients here from now on.
export const TRUSTED_BY = [
  { name: "SyncMint", src: "/logos/syncmint.png", height: "h-8" },
  { name: "AlphaIndigo", src: "/logos/alphaindigo.png", height: "h-5" },
  { name: "Studio Vider", src: "/logos/studio-vider.png", height: "h-5" },
];

// Static value row — replaced the rotating <HighlightReel> carousel on
// 2026-07-18. A cycling hero carousel is one of the strongest "AI-built site"
// tells (which was exactly the user feedback), only ever showed one phrase at
// a time, and left only the first phrase in the HTML for crawlers/first paint.
// Flat, all four are readable at once and the yellow icon tiles extend the
// same accent as the hero highlight. Single-path stroke icons, inline like the
// other SVGs in this codebase (see login page / status-pill) — no icon
// dependency.
export const VALUE_PROPS: { label: string; path: string }[] = [
  { label: "Send faster", path: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" },
  { label: "Track progress", path: "M3 12h4l3 8 4-16 3 8h4" },
  { label: "Gate access", path: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" },
  { label: "Close deals", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12l2 2 4-4" },
];

export const PRICING: { name: string; id: PlanKey; blurb: string }[] = [
  { name: "Free", id: "free", blurb: "3 documents/mo, 1 user" },
  { name: "Pro", id: "starter", blurb: "Unlimited documents, 1 user" },
  { name: "Team", id: "team", blurb: "Up to 3 users, custom branding" },
  { name: "Business", id: "business", blurb: "Up to 5 users, API access" },
];
