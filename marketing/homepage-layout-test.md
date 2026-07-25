# Homepage layout A/B test

Built 2026-07-25, at Michael's request, to compare CTA performance between
the live homepage layout and the two-column "v20" layout that had been sitting
on the `dev` branch as a preview only (see `homepage-versions/INDEX.md` for
the full version history — v19 introduced the two-column above-the-fold
product shot, v20 fixed its alignment/rhythm bugs, and v21 replaced it with
the current centred single-column layout the same day, judging the collapse
between breakpoints to be a worse problem than what v20 fixed).

## What's being compared

- **`current`** — the live centred single-column hero. Product shot sits
  below the fold, in its own section. `src/components/homepage-current.tsx`.
- **`v20`** — left-aligned two-column hero, product shot beside the copy so
  it's above the fold (matches Robinhood/Lemonade/SignNow's first screen,
  per the competitive review that originally motivated v19).
  `src/components/homepage-two-column.tsx`.

Both variants share identical features/pricing/trusted-by content
(`src/lib/homepage-content.ts`) and an identical footer (`src/app/page.tsx`)
— only the hero structure and container widths differ. `src/app/page.tsx`
is now a thin wrapper: it resolves currency, the (concluded, locked-purple)
`cta-color` flag, and the new `homepage-variant` flag, then renders whichever
variant component the flag picked.

`dev`'s `src/app/page.tsx` is no longer a separate preview file — it's the
same wrapper, so both branches run the same live test rather than one
branch quietly diverging from the other.

## Methodology — same as the concluded CTA color test

Deterministically assigned per visitor via `src/flags.ts`'s
`homepage-variant` flag, using the exact same cookieless approach as the
[CTA color test](./cta-color-test.md): `identify()` derives a bucket from
the request's own `x-forwarded-for` + `user-agent` headers (djb2 hash, mod
2), nothing is written to a cookie or localStorage. Chosen deliberately to
match that test's methodology, at Michael's explicit direction (2026-07-25)
— the one real tradeoff called out before building this: a visitor's IP
changing mid-visit (new network, VPN) can flip which whole layout they see
on their next page load, which is more visible than the color test's same
tradeoff ever was. Accepted anyway, for consistency with the established
approach.

**No Vercel-managed flag, no `FLAGS_SECRET`** — same "Flags as Code" path as
the color test, nothing to configure in the Vercel dashboard.

## How results show up

Every homepage render calls `<FlagValues values={{ "cta-color": ctaColor,
"homepage-variant": homepageVariant }} />`, which Vercel Web Analytics
auto-detects and uses to annotate that pageview and any `track()` events
fired on it — including `cta_click` — with both flag values. So once
there's enough traffic, `get_web_analytics` (or the dashboard's Flags panel)
can be broken down `by: ["flags/homepage-variant"]` to compare, per variant:
visitors, and — filtered to `eventName eq 'cta_click'` — click count. Click
count ÷ visitor count per variant is "CTA performance" for this test, the
same ratio the color test used.

Belt-and-suspenders, matching the color test's own precedent: `CtaLink` now
accepts an optional `variant` prop, and both homepage components pass their
own name (`"current"` / `"v20"`) through it, which lands as a plain
`cta_click` event property — `page: "homepage", position: "hero", variant:
"current" | "v20"`. Results don't depend solely on the flags-in-DOM
mechanism working correctly. Every other `CtaLink` call site on the other
~10 pages omits `variant` entirely and is unaffected.

## Reading it too early

Same caution as the color test: don't call a winner on a day or two of
data. This is a bigger change than a button color — an entire hero layout —
so it's reasonable to expect it might move the needle more, but it also
means a bad early read (say, from one unusually large or small referral
source landing disproportionately in one bucket before volume evens out) is
more costly to act on. No automated check-in is scheduled; run the
comparison manually via Vercel Analytics when there's been enough time and
traffic.

## Ending the test

Once a winner is picked: hardcode `homepageVariantFlag.decide()` in
`src/flags.ts` to always return the winner (`defaultValue` too, matching how
`ctaColorFlag` was locked to `"purple"`), and consider deleting the losing
variant's component + its import branch in `page.tsx` — unlike the color
test, there's a real component to clean up here, not just a class-name
branch. Leave `homepage-content.ts` either way; both variants still need it
even with only one variant left, unless the losing component is deleted
outright.
