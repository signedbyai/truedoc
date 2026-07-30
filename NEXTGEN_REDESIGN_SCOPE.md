# Scope: SignedBy-wide next-gen redesign on dev

Status: SCOPED, NOT BUILT. Waiting on explicit go-ahead.

## What "AI model" means here

There's no separate design tool in play — this would be executed the same
way every other change this year has been: me, working file-by-file in the
sandbox, tested via the `next build` + `vitest` cycle, pushed to `dev` for
your review before touching prod (per your standing rule — test UI changes
in dev first). The one real choice is which model does which phase of the
work:

- **Direction/creative-judgment phase (a handful of pages, done first, as
  mockups before any code):** best done on Opus. This is genuinely
  higher-taste work — picking a visual direction, deciding what to keep vs.
  cut from the current navy/yellow/slate language, resolving the tension
  between "premium" and "stays SignedBy." Worth spending the more expensive
  model here since a wrong direction chosen early gets copied to every page.
- **Sitewide rollout once direction is locked:** Sonnet, same as this whole
  project has run on. It's mechanical once the pattern is set — apply the
  same header/card/button treatment across ~25 marketing + dashboard pages.
- I can render actual visual mockups (not just described intent) using the
  interactive-mockup tool before any code changes, so you're approving a
  picture, not a paragraph. Recommend doing that for the direction phase
  regardless of which model executes it.

## Why now (the drivers)

- **The brand has outgrown its "get it working" phase.** `design-system.md`
  and `V3_Design_Inspiration.md` show a year of tasteful, disciplined
  incremental polish (Lemonade/Robinhood/DocTrack-inspired details, a
  standardized button/card/modal system, a documented accent-color rule) —
  but it was all *addition*, never a from-scratch look pass. The squircle
  badge mark explored 2026-07-26 (see `design-system.md`'s "exploratory, not
  yet in the live app" note) is itself a signal you've already been
  circling a next visual identity bump.
- **The product now has real things to look premium for:** live Stripe
  billing, a seed deck in market, a real API/developer product, first paying
  customers, and paid acquisition running (LinkedIn + Reddit). A utilitarian
  MVP look was the right call at zero customers; it's a worse trade now that
  visitors are arriving from ads and comparison searches where DocuSign/
  PandaDoc's more polished (if bloated) marketing sites set the bar.
- **Dev exists specifically to de-risk this.** The dev-subdomain preview
  environment and the homepage A/B flag infra (both already built) mean a
  full redesign can be built, reviewed, and even split-tested against the
  current homepage before it ever touches prod traffic — the safety net
  that makes attempting something this size reasonable for a lean team.

## Inspiration

Two threads, and the honest tension between them:

1. **Stay disciplined slate/yellow, go one tier more "considered."**
   References: Linear, Vercel, Mercury, Ramp — all utilitarian-adjacent
   brands that read as premium through restraint, type, and spacing
   discipline rather than decoration. This is the lower-risk direction: it
   evolves the existing equity (the design-system doc is explicit that
   yellow "still means something" after a year of consistent reuse — a
   from-scratch palette change would spend that down) rather than replacing
   it.
2. **Borrow more warmth, per the parked Lemonade thread.** `design-system.md`
   #11 already flagged and parked "illustrated empty states / serif warmth"
   as fighting the current utilitarian brand. If "next-gen" means something
   more distinctive than "sharper Linear clone," this is the other real
   option — but it's a bigger swing and the prior note is right that it
   needs the brand to deliberately move that direction, not sneak in
   page-by-page.

Recommend picking thread 1 as the default unless you have a specific
reference site you want me to look at — it's the safer bet for a redesign
whose main job is to look more premium to warm ad traffic, not to change
what the brand feels like.

## Scope: "SignedBy-wide" concretely means

- Marketing: homepage (both live variants), `/pricing`, `/security`,
  `/developers`, all 5 `/vs/*` pages, `/templates` + slug pages,
  `/magic-quote` + its sub-pages, `/quiz`
- App shell: dashboard nav (desktop + mobile), Documents list, document
  detail, Settings, Billing, Team
- Auth: `/login` — but note the existing, deliberate decision that login
  stays utilitarian/fast, not a marketing surface (design-system.md's "Auth
  pages" section) — a redesign pass should preserve that reasoning, not
  relitigate it by default
- Signing flow (`sign/[token]`) is the one surface I'd explicitly recommend
  *excluding* from a first pass — it's had multiple dedicated speed/friction
  passes this year and "no added steps" is a standing rule; a broad
  redesign sweep is the wrong tool for a page whose job is to stay minimal

## Suggested approach if you greenlight this

1. Direction phase: 2-3 mockups (homepage hero + one dashboard screen) on
   Opus, reviewed with you before anything else moves.
2. Once approved, systematic rollout on Sonnet across the page list above,
   on `dev`, in batches with build+test checks between batches (same
   workflow as every other change this year).
3. Ship to `dev.signedby.ai` for your review; homepage specifically can run
   through the existing A/B flag before a full prod cutover if you want
   data rather than just a gut call.

## Open questions
- Confirm thread 1 (disciplined/premium) vs. thread 2 (warmer/Lemonade) as
  the direction before I build any mockups.
- Confirm the signing-flow exclusion, or tell me to include it anyway.
