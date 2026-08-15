# Verified Badge invoice page — pill + CTA copy test

Started 2026-08-09, direct ask, as a 3-way split — widened to 6-way the same
day (D/E/F added). Same methodology as the concluded
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
| D | Protect Your Invoices and Get Paid | Protect Your Invoices and Get Paid | Secure Your First Invoice Now → |
| E | Seal in Seconds. Protect Always. | Seal in Seconds. Protect Always. | Start Sealing → |
| F | Client Trust, Instantly Verified | Client Trust, Instantly Verified | Seal Your Invoices Now → |

B drops the "Free" and security-claim ("Tamper-Evident") language entirely
for a shorter, more direct pill. C reframes around the action ("make a
verified invoice") instead of a security claim. D/E/F (2026-08-09, direct
ask) came from attached hero-section concept mockups — reference images
only, not pages that exist anywhere in this app: D leads with the outcome
("get paid," not just "secure"), E leads with speed, F leads with the
*client's* experience rather than the sender's. The pill, the bottom
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

**D/E/F deliberately don't adopt the reference mockups' visual design** —
those show a wax-seal-style badge graphic, a 3-step process section, and a
different page structure entirely. Only the copy was pulled across, kept in
the same pill/heading/button slots and the same visual styling as A/B/C.
Mixing new visuals into only 3 of 6 variants would confound the read (a
winner's cause becomes unclear: was it the words, or the picture next to
them?). If the visual direction is wanted too, that's a bigger scope than
this copy test and worth its own pass.

**Widening 3→6 makes this a slower read, on purpose accepted.** The
concluded cta-color test's own history is the cautionary tale here: it
started 3-way, got narrowed to 2-way specifically because 3-way was
diluting signal too much at this site's traffic volume, then was
deliberately reverted to 3-way anyway (accepting the slower read) once a
confound-free concurrent test mattered more than speed. This test is now
double that split, on a lower-traffic page than the homepage the color test
ran on. Expect this to need meaningfully longer than the original 1-2 week
estimate to separate any variant from noise.

**Still unresolved as of the 2026-08-09 widening: Vercel Web Analytics is
not enabled on this project.** Confirmed via a live `get_web_analytics` API
call the same day (returned 404 "Web Analytics not found"), same gap
already flagged for the Reddit invoice campaign's pixel. Nothing below is
actually queryable — old variants or new — until this is turned on in the
Vercel project's Analytics settings. `FlagValues` and `track("cta_click")`
are both firing correctly; there's simply nowhere for the data to land yet.

## How it's wired

- `src/flags.ts` — `verifiedBadgeInvoiceCtaFlag`, 6-way hash bucket via the
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
test. At this page's traffic volume, a 6-way split needs real time to
separate from noise (see the "widening 3→6" note above).

## Ending the test

Once a winner is picked: hardcode that variant into `CTA_COPY` (or set it as
`verifiedBadgeInvoiceCtaFlag`'s `defaultValue` and drop the others from
`VERIFIED_BADGE_INVOICE_CTA_VARIANTS`), same pattern the cta-color test used
to lock in `purple`.

---

## Narrowed to 2 arms — 2026-08-13

Direct ask, after working through whether this test could actually resolve.
It couldn't: ~1,200 visitors/week to this page (Vercel Web Analytics, 7-day)
split six ways is ~200 per arm per week, and picking the best of six noisy
estimates carries a multiple-comparisons penalty on top of that. Two arms puts
~600/week behind each, which is answerable in weeks rather than never.

**Live arms now: A (control) vs C (challenger).** Set in `ACTIVE_VARIANTS` in
`src/flags.ts` — deliberately separate from
`VERIFIED_BADGE_INVOICE_CTA_VARIANTS`, which still lists all six so every
variant stays renderable.

### Why A stays as control

It's the only framing that continues the message of the ad actually driving
this page's traffic — "Verified Badge - Portrait - Invoice Fraud Angle",
3.585% CTR, the best-performing ad in the Reddit account. The A/B/C headline
("AI can fake an invoice in seconds. Prove yours is genuinely you.") names a
specific, current fear; D/E/F replace it with trust language any competitor
could run.

A's pill was also shortened the same day, from "Secure Your Invoice for Free –
Verified & Tamper-Evident" (55 chars) to "Secure Your Invoice for Free". The
long version needed ~383px on one line against the ~327px a 375px iPhone
actually gives, so it wrapped to two lines while B–F all fit on one. With 92%
of traffic on mobile, the control was rendering worse than its own challengers
— the test was partly measuring layout rather than copy. Any result from
before 2026-08-13 is confounded by this and should not be used.

### Archived variants

Not deleted. All copy still lives in `CTA_COPY` (and `REDESIGN_HEADLINES` for
D/E/F) in `src/app/verified-badge-invoices/page.tsx`, and every variant
remains viewable at `/verified-badge-invoices?variant=A` … `?variant=F`. Only
live bucketing changed.

| Variant | Pill | Button | Why dropped |
|---|---|---|---|
| B | "Secure Your Invoice Now" | "Get Your Verified Badge →" | Drops "for Free" from every slot — the strongest single word available to a free-tier product with no card required. |
| D | "Protect Your Invoices and Get Paid" | "Secure Your First Invoice Now →" | Generic outcome framing; also carries the heaviest visual treatment (large floating hero + 3-step section) on a page that is 92% mobile with a 78% bounce rate. |
| E | "Seal in Seconds. Protect Always." | "Start Sealing →" | Generic speed framing. Its before/after hero card pair also overflowed the viewport on every common iPhone until fixed in `d0ba7dd`. |
| F | "Client Trust, Instantly Verified" | "Seal Your Invoices Now →" | Generic trust framing, and removes the invoice mockup entirely in favour of a decorative wax seal — which explains nothing to someone arriving from an invoice-fraud ad. |

### Bringing one back

Add it to `ACTIVE_VARIANTS` in `src/flags.ts`. Nothing else needs rebuilding —
the copy, the D/E/F redesign branches, `HeroInvoiceCard`, `MiniInvoiceCard`
and the 3-step section are all still in place and reachable.

### How to read it

Web Analytics is now enabled (it wasn't on 2026-08-09, which is why nothing
from the first four days of the original 6-way run is queryable).

**Read it through the Vercel web dashboard** — Analytics → Flags panel broken
down by `flags/verified-badge-invoice-cta`, cross-referenced with the Events
panel filtered to `cta_click`. The `get_web_analytics` MCP tool is NOT a
reliable path: the connector was unresponsive throughout 2026-08-13, so the
dashboard is the working route.

One thing still worth confirming on the first read: the UTM Parameters panel
is gated behind Web Analytics Plus on this project. If the Flags breakdown or
custom-event properties turn out to be gated the same way, this test has no
read path regardless of how many arms it has — narrowing to two fixes the
statistics, not the instrumentation. Check that before letting it run two
weeks.
