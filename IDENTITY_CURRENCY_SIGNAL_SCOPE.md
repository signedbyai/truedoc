# Identity-verified country as a currency signal — scope

Status: SCOPED 2026-08-03, not built. Direct ask: "can we scope out
using the ID check on Stripe as an element to check the currency, if
the ID check is Europe then EUR, if Swiss then CHF, if India then INR,
and then everywhere else USD?"

## What already exists to build on

The mapping logic this asks for already exists and needs zero changes:
`currencyForCountry()` in `currency.ts` takes any ISO country code and
returns EUR/GBP/CHF/INR/USD via the same EUROZONE/STERLING/FRANC/INDIA
sets `getRequestCurrency()` already uses for the IP-geo signal today.
Feeding it a different *source* of country code (identity-verified
instead of IP-geo-derived) is a small change to a well-established
pattern, not a new pricing system.

The Stripe Identity data is also already flowing through the codebase
today, just discarding the one field this needs.
`src/app/api/webhooks/stripe/route.ts`'s `identity.verification_session.verified`
handler already retrieves the session with `verified_outputs` expanded
and reads `outputs.first_name`/`outputs.last_name` to store
`identity_verified_name`. That same `verified_outputs` object (confirmed
against Stripe's live API docs, not assumed) has an
`address.country` field — a real ISO 3166-1 alpha-2 code derived from
the verified ID/address match, sitting right there unused. **No new
Stripe API call needed** — this is one more line in an existing webhook
handler plus one new nullable `organizations.identity_verified_country`
column (migration).

## The real coverage limits — read before assuming this "just works"

This is a genuinely narrower feature than it might sound, for two
structural reasons:

**1. It can only ever apply to a known org, never an anonymous visitor.**
`/pricing`, `/console`, and `/verified-badge` are pre-signup marketing
pages — `getRequestCurrency()` runs with no org context there today, and
identity verification is an org-level action (`startOrgIdentityVerification`,
`identity.ts`) that can't exist before an org does. So this cannot touch
the anonymous-visitor pricing display at all — only checkout flows that
already resolve an `orgId` (`/api/billing/checkout`,
`/api/billing/credits/checkout`) are candidate integration points.

**2. Most orgs will never have this signal at all.** Identity
verification only happens when an org actually seals a Verified Badge
document — real but not universal. An org that never touches Verified
Badge (plenty of Pro/Team/Business subscribers, per
[[console-free-tier-scope]]'s framing of Verified Badge as one feature
among several) simply has `identity_verified_at: null` forever, and
checkout falls through to today's geo-IP/cookie logic unchanged. This is
additive to the existing system, not a replacement for it.

**The one genuinely interesting timing case, worth naming explicitly:**
Free-tier orgs get Verified Badge sealing before ever subscribing to
anything ([[console-free-tier-scope]] — "Free console = Verified Badge
only"). That means a real slice of orgs will complete identity
verification *before* their first paid checkout, so by the time currency
actually needs resolving for real money, a stronger-than-IP signal may
already be sitting on the org row. That's the actual, narrow case worth
building this for — not "replace geo-IP everywhere," but "have a better
signal ready for the orgs that happen to have one by the time it
matters."

## Why bother — the honest motivation, not just "more accurate"

Plain accuracy (VPNs, corporate proxies, mobile carrier exit nodes
routing through the wrong country) is a real but modest win — geo-IP is
already decent, and the existing manual currency-switcher cookie is
already the documented escape hatch for when it's wrong
(`currency.ts`'s own comment: "the escape hatch for VPN/wrong-geo").

The sharper case is **PPP-discount integrity**: INR pricing is a genuine
~55%-off-nominal discount ([[india-inr-v05-and-razorpay-scope]]), which
is exactly the kind of gap a VPN + the currency-switcher cookie can be
used to arbitrage from anywhere in the world. A government-ID-verified
country is a materially harder signal to fake than an IP address. If
this is worth building, the fraud/pricing-integrity framing is the
stronger justification — worth being explicit about which motivation is
driving it, since that changes the recommended design below.

## The real open decision: does this override an explicit currency choice?

Two different features hide inside one request, and they need different
answers:

- **Fill-in-the-gaps framing** ("better than a bad IP-geo guess"): only
  use the identity-verified country when there's *no* manual
  cookie override — i.e. it competes with the geo-IP fallback, not with
  a person's own explicit selection. Respects the currency switcher's
  stated purpose as an escape hatch for the person to correct a wrong
  guess.
- **Pricing-integrity framing** (stop VPN+cookie INR arbitrage): the
  identity-verified country should *outrank* even an explicit cookie
  selection — if Stripe Identity says the org is in the US, a
  `sb_currency=INR` cookie shouldn't win at checkout regardless of what
  the visitor picked.

Recommendation: the integrity framing is the one actually worth
building this for (per the section above), so identity-verified country
should sit **second** in precedence — below only "existing Stripe
customer's locked currency" (a hard technical constraint already coded
in `/api/billing/checkout` and `/api/billing/credits/checkout` — Stripe
itself refuses a currency switch on an existing customer, nothing to
decide there), and **above** both the cookie override and geo-IP:

```
locked Stripe customer currency (existing, unchanged)
  → identity-verified country, if the org has one on file   [NEW]
  → manual currency cookie
  → geo-IP header
  → USD default
```

**Decided (2026-08-03): the former** — identity-verified country
overrides the manual currency cookie, per the integrity framing above.
Direct instruction, no further discussion needed on this point before
build time.

## Where this plugs in

`getRequestCurrency()` (`currency.server.ts`) stays as-is — it has no
org context and shouldn't grow one; today's two callers that DO have an
`orgId` (`/api/billing/checkout`, `/api/billing/credits/checkout`) are
where a new small helper — something like
`resolveCheckoutCurrency(orgId, requestCurrency)` — would sit, reading
`organizations.identity_verified_country` and applying the precedence
above before falling back to the `requestCurrency` those routes already
compute. This does add one DB read to those routes that isn't there
today (both already `select` from `organizations` for
`stripe_customer_id` in the same call, so it's one extra column on an
already-happening query, not a new round trip).

## Data model

One migration: `organizations.identity_verified_country` (text,
nullable, ISO 3166-1 alpha-2). Written in
`src/app/api/webhooks/stripe/route.ts`'s existing
`identity.verification_session.verified` case, alongside the
`identity_verified_at`/`identity_verified_name` write already there —
`outputs.address?.country ?? null`. No backfill needed for orgs already
verified before this ships; their next re-verification (365-day
freshness window, [[verified-badge-build]]) picks it up naturally, or a
one-off backfill script could re-fetch `verified_outputs` for
already-verified orgs from Stripe directly if immediate coverage matters.

## Legal/privacy flag — real, not a formality

Stripe Identity data is collected today for a specific, disclosed
purpose: proving the identity behind a Verified Badge seal. Using
`verified_outputs.address.country` to influence billing currency is a
new use of that same data, even though it's a narrow field (a country
code, not the full document). Per this project's own established
pattern ([[feedback-update-legal-pages-with-new-processors]]) — update
`/privacy` (and possibly `/dpa`) in the same pass, not after, with a
line disclosing that identity verification data may also inform
billing currency. This is a small addition, not a big one, but skipping
it repeats the exact gap flagged and fixed for RFC 3161 disclosure
([[legal-pages-subprocessors]]) — don't ship the data use before the
copy.

## Explicitly out of scope

- **Fixing anonymous `/pricing` display accuracy** — structurally
  impossible with this signal; no org exists yet for an anonymous
  visitor. Geo-IP/cookie remains the only signal there.
- **Retroactively correcting an already-locked Stripe customer's
  currency** — Stripe doesn't allow a currency switch on an existing
  customer at all; this signal can only ever affect a *first* checkout,
  same constraint the existing lockedCurrency check already lives with.
- **Per-signer identity checks (`STRIPE_IDENTITY_SCOPE.md`)** — that's a
  separate, not-yet-built, per-document feature; this scope only touches
  the org-level identity check that's already live.
- **Blocking/rejecting a mismatched currency selection outright** (vs.
  silently using the better signal) — a harder-edged version of the
  integrity framing (e.g. showing an explicit "we've verified your
  account is in the US, INR pricing isn't available" message) that
  wasn't asked for and adds real UX/support-load surface; the scope
  above is a quiet precedence change, not a user-facing block.

## Effort

Small-to-medium. The mapping function, the Stripe field, and the
precedence pattern (an existing signal beating a weaker one) all already
exist in some form elsewhere in this codebase — the real work is one
migration, a few lines in the webhook handler, the new helper function,
wiring it into the two checkout routes, and the /privacy copy update.
The precedence-ordering decision above is the one piece worth explicit
sign-off before writing code, since it's a real behavior change
(possibly overriding someone's own currency choice) rather than a pure
implementation detail.
