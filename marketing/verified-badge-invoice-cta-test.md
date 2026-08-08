# Verified Badge invoice page — pill + CTA copy test

Started 2026-08-09, direct ask. Same methodology as the concluded
[cta-color-test](./cta-color-test.md): a real `flags/next` flag, cookieless,
hash-bucketed per visitor, read later via Vercel Analytics. Runs on
`/verified-badge-invoices` only.

## Variants

Deterministically assigned per visitor via `src/flags.ts`'s
`verified-badge-invoice-cta` flag (`VERIFIED_BADGE_INVOICE_CTA_VARIANTS` in
that file):

| Variant | Pill copy (hero) | Bottom-section heading | Button copy (hero + footer) |
|---|---|---|---|
| A (current / control) | Secure Your Invoice for Free – Verified & Tamper-Evident | Secure Your Invoice for Free | Get Your Verified Badge Now → |
| B | Secure Your Invoice Now | Secure Your Invoice Now | Get Your Verified Badge → |
| C | Make a Verified Invoice for Free | Make a Verified Invoice for Free | Verify Your Invoice for Free → |

B drops the "Free" and security-claim ("Tamper-Evident") language entirely
for a shorter, more direct pill. C reframes around the action ("make a
verified invoice") instead of a security claim. The pill, the bottom
"Generate Your Proof" section heading (added 2026-08-09 so that section
reads consistently with the top pill instead of staying static across
variants), and the CTA button text all change together per variant — tested
as one paired unit, not independently.

**C's button intentionally doesn't match its own pill/heading wording.**
"Make a Verified Invoice for Free" risks implying SignedBy generates
invoices (it doesn't — it seals/verifies a PDF you already have), flagged
as a real accuracy risk during review. Rather than drop variant C, the
button was changed to "Verify Your Invoice for Free" so the actual click
moment states what the product does, even though the pill/heading above it
keeps the more provocative "Make a..." framing being tested.

## How it's wired

- `src/flags.ts` — `verifiedBadgeInvoiceCtaFlag`, 3-way hash bucket via the
  shared `identify()` visitorKey (same `x-forwarded-for` + `user-agent`
  derivation as `ctaColorFlag`).
- `src/app/verified-badge-invoices/page.tsx` — `CTA_COPY` map keyed by
  variant, drives both the pill `<span>` text and the two `<CtaLink>`
  instances (hero position + footer position). `<FlagValues
  values={{ "verified-badge-invoice-cta": ctaVariant }} />` annotates every
  pageview and `track()` event on this page with the variant.
- `src/components/cta-link.tsx` — already supported a `variant` prop
  (added for the homepage-layout test); both `<CtaLink>` calls on this page
  now pass `variant={ctaVariant}`, so `cta_click` events carry the variant
  as a plain event property too — belt-and-suspenders, doesn't rely solely
  on the flags-in-DOM mechanism.

Deliberately cookieless — a visitor's variant can shift if their IP changes
mid-visit, same accepted tradeoff as every other flag in this file.

## How to read results

Intended to run **1-2 weeks** (direct ask). Read the same way as the
concluded cta-color test:

- Vercel dashboard → Analytics → Flags panel, broken down by
  `flags/verified-badge-invoice-cta`, cross-referenced with the Events panel
  filtered to `eventName eq 'cta_click'` and `page eq
  'verified-badge-invoices'`.
- Or via the `get_web_analytics` MCP tool: `dataset: "events"`, filter
  `eventName eq 'cta_click'` and `page eq 'verified-badge-invoices'`, broken
  down `by: ["flags/verified-badge-invoice-cta"]` (or the plain `variant`
  event property) to get click counts per variant; divide by
  `flags/verified-badge-invoice-cta` pageview exposures for CTR per variant.

Don't call a winner on a day or two of data — same caution as the color
test. At this page's traffic volume, a 3-way split needs real time to
separate from noise.

## Ending the test

Once a winner is picked: hardcode that variant into `CTA_COPY` (or set it as
`verifiedBadgeInvoiceCtaFlag`'s `defaultValue` and drop the others from
`VERIFIED_BADGE_INVOICE_CTA_VARIANTS`), same pattern the cta-color test used
to lock in `purple`.
