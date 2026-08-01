# API tier access — scope

Status: BUILT 2026-08-02. Everything under "Decisions" and "Where this plugs
into existing code" below is implemented and passing tests/type-check —
still needs a push/deploy (sandbox has no git push credentials). The two
items under "Open questions" remain genuinely open (not part of this
build): Team-branding grandfathering, and exact pricing-card wording
nuance (the pricing-card copy itself was written, just flagging the
wording wasn't treated as a bikeshed-free decision).

## Why this one

Direct question: "Can we allow the API access starting at the Pro tier and
not limit it to just business?" Turned into a competitive check before
answering, since this is a real pricing/revenue decision, not just a copy
tweak.

## Competitive grounding

**SignNow** (`signnow.com/developers`) — free tier is a sandbox/dev account
only (500 test invites, capped at 500 requests/hour), not an ongoing free
production tier. Production costs $2/invite down to $1.20/invite at volume.
But every paid plan — cheapest included — gets the *full* feature set:
webhooks, branding, bulk send, embedded signing. Their own FAQ says it
outright: "no hidden costs or tiered restrictions." The axis they compete on
is volume/price, not which features a tier unlocks.

**eSignatures.com** — no subscription tiers at all. $0.49/contract flat,
pay-per-use, zero monthly minimum, and free unlimited test/sandbox accounts.
API, webhooks, branding, bulk send — all included for every customer from
account #1. Closest thing to "free API access" among real competitors, and
it's their entire pitch.

**The pattern in both:** differentiate by volume/price, not by locking
individual features (webhooks, branding) behind a subscription tier.
SignedBy is the outlier — API access today is a binary Business/not-Business
switch, and even Pro's existing metered access isn't marketed anywhere.

## Current SignedBy gating (grounded in code, not assumed)

Two separate feature flags in `src/lib/plan.ts`, both feeding
`src/lib/api-auth.ts`'s `authenticateApiRequest()`:

- `apiAccess: ["business"]` — unlimited, included access to the plain REST
  API (`/api/v1/documents` and friends). Also the *only* flag
  `src/app/api/org/webhooks/route.ts` checks — so webhooks are Business-only
  today, full stop.
- `consoleAccess: ["starter", "team", "business"]` — metered access (20 free
  document-sends/month, then billed per document), originally built for
  console.signedby.ai's chat UI but `authenticateApiRequest()` honors it for
  the plain REST API too, returning `metered: true`. So **Pro and Team
  orgs already have programmatic document-send access today** — it's just
  metered, undocumented on the marketing site, and doesn't include
  webhooks.

**Marketing is already stale relative to the code.** `/developers`'s hero,
meta description, and "Included in Business ($29/mo)" card all say
Business-only; its example `402` response
(`"API access requires the Business plan."`) doesn't match the real runtime
error, which already mentions the Pro/metered path. `dashboard/settings/page.tsx`
is the one place that's accurate today ("API access is available on the Pro
plan (metered) or Business plan (unlimited)").

## Decisions (2026-08-01)

1. **REST API + webhooks unlock at Pro — but stay metered there,
   correcting this doc's first pass.** The first pass of this scope said
   "full unlimited access moves to Pro, no metered-vs-unlimited split" —
   overridden same day. Reason given: Console's bulk-send has no volume
   cap of its own (the 200-recipient cap was deliberately removed
   2026-07-31, see `console-bulk-send-cap-removed` memory) — metering is
   the *only* thing standing between a Pro-tier org and an unbounded bulk
   send today. Making Pro unlimited would remove that safety valve
   entirely, not just extend a perk. So: Pro/Team get real, first-time
   access to the plain REST API *and* webhooks (both currently
   Business-only via `apiAccess` — Pro/Team already have metered document
   creation today but no webhooks at all, a real gap independent of this
   decision), but volume stays metered under the same mechanism Console
   already uses. **Business remains the only genuinely unlimited/unmetered
   tier** — see #3, that's now doing real differentiation work again.
2. **The free-before-billing threshold rises from 20 to 50 document-sends/month**
   — same metering mechanism (`CONSOLE_FREE_ALLOWANCE` in
   `src/lib/console-usage.ts`), just a more generous number, direct
   instruction. Applies uniformly — Console chat and direct REST API calls
   both go through `authenticateApiRequest()` → the same allowance.
3. **Business's differentiator moves to branding exclusivity + seat count**,
   not API access. Branding decision below reverses a prior merge —
   flagging that explicitly since it was a deliberate choice at the time.
4. **Free tier's "sandbox" is the existing 3-documents/month cap, now also
   reachable via the API** — not a separate non-sending test mode. See
   below.

## Where this plugs into existing code

- `api/org/webhooks/route.ts`: currently only checks `apiAccess`
  (business-only). Needs to also accept `consoleAccess`, same combined
  check `authenticateApiRequest()` and `dashboard/settings/page.tsx` already
  use (`hasApiAccess || hasConsoleAccess`) — this is the concrete change
  that gives Pro/Team webhooks for the first time. `apiAccess` itself
  **stays `["business"]`** — it still means "unlimited, unmetered," which
  is still true only for Business after decision #1 above. No `plan.ts`
  gating-array change needed for the REST API/webhooks unlock itself; Pro/
  Team already pass `consoleAccess`.
- `src/lib/console-usage.ts`: `CONSOLE_FREE_ALLOWANCE` changes from `20` to
  `50`. One constant, but the number is echoed as hardcoded prose in
  several places that all need the same edit: `app/developers/page.tsx`
  ("20 free document-sends/month"), `app/console/page.tsx` (two spots —
  "20 document-sends free every month" and the `$0.25 per document`
  sentence, price itself unaffected), `app/dashboard/settings/page.tsx`
  ("20 free document-sends a month"), `app/verified-badge/page.tsx` (two
  spots — Verified Badge seals ride the same Console metering, "20 free
  document-seals a month"). `console-usage-panel.tsx` and
  `console-usage.test.ts` read the constant directly, no edit needed there.
- `pricing-cards.tsx`: move the `"API access"` bullet from Business's
  feature list up to Pro's, worded to reflect it's metered
  (`["Unlimited documents", "1 user", "Templates & reminders", "AI-drafted
  documents", "Engagement tracking", "API access (metered)"]` or similar —
  exact wording not decided). Business's list drops the bullet, gains the
  branding/seats replacement (see below) plus keeps "unlimited API access"
  as an explicit callout, since that's real again post-decision #1.
- `/developers` page: hero copy, meta title/description, the "Included in
  Business ($29/mo)" card, the Authentication section's `402` example, and
  the footer CTA ("upgrade to Business ($29/mo) whenever you're ready for
  your API key") all currently assert Business-only and need a rewrite —
  now "Pro unlocks the API, metered; Business is unlimited" rather than
  "Business only."
- `dashboard/settings/page.tsx`: its existing three-way copy
  (`hasApiAccess` / `hasConsoleAccess` / neither) is actually already the
  right shape for this decision and barely needs to change — it already
  says "Pro plan (metered) or Business plan (unlimited)" in the gate-line
  copy. Mainly needs the webhooks section to stop being hidden for
  metered-only orgs once the webhooks route itself is widened.
- `plan.test.ts`: the existing `"gates apiAccess and paymentCollection to
  business only"` test stays correct as written — `apiAccess` didn't
  change. A new test is worth adding for the widened webhooks gate instead.

## Business's new USP — branding & seats

**Decided: branding becomes Business-exclusive again — Team loses it.**
Direct instruction: "team should not have the branding so that makes
business a bigger step." This **reverses the 2026-07-17 merge**
(`branding`/`customBranding` moved from `["business"]` to `["team",
"business"]` — see `team_business_tier_features` memory), which was made on
purpose at the time "to stop undercutting Team." Worth being explicit about
that tension rather than quietly overwriting it: the 07-17 reasoning was
sound *given API access was still Business's differentiator* — once API
access stops being exclusive (this scope doc), Business needed a
replacement, and branding exclusivity is the one being reinstated. Not
revisited: whether Team's current branding customers (if any exist yet)
need any grandfathering — worth checking before shipping the plan.ts
change, not assumed here.

- `plan.ts` change: `FEATURE_PLANS.branding` and `.customBranding` both
  revert from `["team", "business"]` to `["business"]`.
- `BrandingSettings`'s inline copy ("available on the Team plan") and
  `dashboard/settings/page.tsx`'s Workspace card description both need to
  go back to saying Business.

**Seats: staying as-is for now.** `TEAM_MEMBER_LIMIT` today is `team: 3,
business: 5` (`plan.ts`) — decided to leave the cap at 5, not raise it,
until there are actual Business customers to size the change against
real usage rather than a guess. Branding exclusivity (above) is doing the
"bigger step" work for now; seats stays a live idea, not a commitment, and
isn't part of what this scope authorizes building.

## Free tier sandbox

**Decided: the existing 3-documents/month free cap, reachable via the API,
is the sandbox** — no separate non-sending test mode. Direct instruction:
"probably the 3 docs per month cap enforced on the API make it a
sandbox." This is the cheap option flagged in this doc's first pass —
`checkFreePlanDocCap` already doesn't care which route created the
document, so Free-tier orgs generating an API key and hitting
`/api/v1/documents` would just consume the same 3/month allowance the
dashboard UI does. Real trade-off, worth restating since it wasn't fully
resolved before this direction was picked: this isn't a true sandbox in
the SignNow/eSignatures sense (a space to test integration code without
touching real send volume) — a Free-tier developer's 3rd real document
send *is* their last free one for the month, whether it came from the API
or the UI. Good enough to say "you can build against a real account before
paying," not good enough to say "test freely, no cost to your usage."

## Explicitly out of scope

- **Usage-based/pay-per-document pricing** (eSignatures.com's model) —
  SignedBy stays subscription-tiered; this scope is about which tier
  unlocks API access, not about replacing the pricing model itself.
- **Rate limit changes** — `/developers` currently states 60 document
  creates/hour/org; not revisited here.
- **MCP server tier** — already Pro+ via `consoleAccess`, unaffected by this
  change either way.

## Effort

Small-to-medium for the core gating change itself (a `plan.ts` array edit +
a pricing/marketing copy pass across `pricing-cards.tsx`, `/developers`,
`dashboard/settings/page.tsx`). The metering-removal cleanup and the Free
sandbox mode, if pursued, are separate and larger.

## Open questions

1. **Existing Team orgs with branding already configured** (logo/colour
   set) — does reverting `branding`/`customBranding` to Business-only strip
   that from them immediately, or grandfather until their next renewal?
   Not addressed by the direct instruction, worth a decision before
   shipping.
2. **Exact wording for Pro's "API access (metered)" pricing-card bullet** —
   flagged above, not decided.

**Not open, decided:** Business's seat cap stays at 5 for now — raising it
was floated as part of "bigger step" but explicitly deferred until there
are real Business customers to size it against (see above). Not part of
what this scope authorizes building.
