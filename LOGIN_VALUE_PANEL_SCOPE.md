# Login screen value panel — scope

Status: SCOPED 2026-08-03, not built. Direct ask: "we need to add
something... maybe on the left or the top... 'Create your free account.
✅ Sign or seal 3 documents a month. ✅ Access API & MCP keys. ✅ No
credit card required.'" — a less sterile `/login` screen.

## Current state

`login/page.tsx`'s `<main>` is `flex min-h-screen flex-col items-center
justify-center bg-slate-50 px-4 py-12` wrapping one `max-w-sm` (384px)
white card, centered, alone on the page. No imagery, no value prop, no
visual distinction between this and a generic SaaS login form — the
"sterile" description is accurate. Everything in the card today is
mechanical: magic-link/OTP entry, Google/Microsoft OAuth buttons,
password fallback (see `[[github-login-scope]]` for the pending third
OAuth option). Nothing on the page currently tells a first-time visitor
what they're signing up for.

## Content check — the proposed copy is accurate against what's actually shipped

Worth confirming before writing marketing copy into a scope doc, given
this project's history of catching overclaims before they ship:

- **"3 documents a month"** — matches `pricing-cards.tsx`'s live Free
  bullet list and `PRICE_TABLE`'s free tier exactly.
- **"Sign or seal 3 documents a month"** — both real. Verified Badge
  sealing on Free is real ([[console-free-tier-scope]]), and Free-tier
  document sending through the normal dashboard upload-and-send flow
  (not Console's send tool, which does need a template) is also real —
  both run through the same `checkFreePlanDocCap`-gated routes, so "3
  documents" covers either action against one shared monthly cap.
- **"Access API & MCP keys"** — confirmed directly against
  `/api/org/api-key/route.ts` ("No plan gate here anymore... every plan
  now has a real path") and `/api/mcp/route.ts` (gated on
  `consoleAccess`, which includes `"free"` in `plan.ts`'s
  `FEATURE_PLANS`). A Free org can generate a real API key today and
  call both `/api/v1/*` and the MCP server with it, capped at the same
  3-doc/month limit — not a metered/unlimited perk, but a genuinely real
  one, not vaporware.
- **"No credit card required"** — Free is $0 forever, not a trial;
  matches the "Free on every plan, including Free. No credit card
  required." line already used on `/console`, `/verified-badge`, and
  other CTA pages.

No corrections needed — the requested copy can ship close to verbatim.

## Layout options

**Option A — left value panel, form on the right (recommended).** Split
`<main>` into two columns on larger screens (`lg:flex-row`): a left
panel carrying the headline + checklist (and room for a small supporting
visual — the existing `/hero-magic-quote.png`-style real product shot,
or the Verified Badge hero image, rather than stock art, matching this
project's established "real screenshot over illustration" preference —
see [[magic-quote-hero-screenshot]]), collapsing to a stacked block
*above* the form card on mobile (`hidden lg:flex` swapped for a
`lg:hidden` mobile variant, or one shared component that just
reflows — simpler to maintain as one component with responsive classes
than two). This is the standard high-converting SaaS auth-page shape
(Linear, Notion, Vercel all use some variant) — a value panel earns its
keep by being the first thing seen on desktop, not an afterthought
scrolled past.

**Option B — top banner, form unchanged below.** A single strip above
the existing centered card, same width as the card or full-bleed,
carrying the headline + checklist inline or stacked. Lower effort (no
responsive two-column logic, no breakpoint-dependent hide/show), and
naturally mobile-safe since there's only ever one column — but reads
more like a dismissible announcement bar than a considered value prop,
and pushes the actual form further down the fold on short viewports.

**Recommendation: Option A on desktop, degrading to Option B's shape on
mobile** — not a real conflict between the two, since A's mobile
fallback and B are functionally the same layout (stacked, single
column). The only real decision is whether desktop gets the fuller
split-screen treatment or stays single-column with just a banner added.
Given the request explicitly named "left" first, Option A is likely the
intended direction.

## What goes in the panel

Headline + the three checkmarked lines as given, verbatim (content
already checked above). Suggested additions, not requested but cheap
given the space:
- A supporting visual below the checklist — a small cropped shot of the
  Verified Badge card or a Console chat exchange, echoing the "show, not
  just claim" pattern the marketing pages already lean on, rather than
  generic iconography.
- The existing `LanguageSupportRow` pill (already used on
  `/magic-quote` and other CTA pages) could sit here too, signaling
  breadth without adding new copy.

Neither is required to satisfy the request — flagged as easy value-adds
in the same pass, not scope creep, since the panel needs *some* visual
weight to avoid just being a second wall of text next to the first.

## What this does NOT touch

- The actual form/auth logic (`handleMagicLink`, OAuth handlers, OTP
  flow) — purely additive, a new panel alongside the existing card, not
  a rebuild of it.
- `isSignup` vs. sign-in copy branching — the value panel makes sense on
  both (a returning user isn't harmed by seeing it, and today's
  `intent=signup` flag only changes button/heading text inside the
  existing card, not page structure).
- No A/B test infrastructure — this ships as a straight replacement
  unless explicitly asked to test old-vs-new (the project already has
  precedent for that, [[homepage-layout-ab-test]], if wanted later).

## Effort

Small. One new component (the value panel, reusable if it should also
ever appear on `/login?intent=signup` specifically vs. both views — TBD,
default assumption is both), a layout change to `login/page.tsx`'s outer
`<main>` from single-column-centered to a responsive two-column split,
no backend/data changes at all. Comparable in size to the console
empty-state promo redesign already shipped
([[console-empty-state-verified-badge-promo]]).
