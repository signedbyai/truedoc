# Settings: download last invoice + optional VAT number — scope

Status: **built 2026-07-28** (Settings entry point + portal-configuration
script). One manual step remains — see "Still to do" at the bottom. Ask: a
place in Settings for a customer to download their last SignedBy invoice for
their own tax reporting, and to enter an optional VAT number.

## What already exists (this changes the shape of the build a lot)

- `stripe.customers.create()` (`api/billing/checkout/route.ts`) sets
  `email`+`name` only on the Stripe Customer — no address, no tax ID, nothing
  else.
- Every subscription renewal already produces a real Stripe Invoice object
  (this is automatic subscription billing — not something SignedBy generates).
  Nothing in this codebase stores or lists them locally: grepped
  `api/webhooks/stripe/route.ts` and the only invoice-touching code is the
  `invoice.payment_succeeded` case used for the referral reward, which reads
  `amount_paid`/`customer` transiently and discards the rest. There's no
  `invoices` table.
- A Stripe-hosted **Customer Portal** is already wired up:
  `api/billing/portal/route.ts` creates a portal session for the org's
  `stripe_customer_id` and the Settings page already links to it (Settings →
  "Plan & team" card → "Manage billing" → `/dashboard/billing` →
  `ManageBillingButton` → this route → `session.url`).
- Confirmed against Stripe's current API docs
  (docs.stripe.com/api/customer_portal/configurations/create): the portal
  configuration has two features that are exactly this ask, with no invoice-
  fetching or tax-ID-syncing code needed:
  - `features.invoice_history.enabled` — shows the customer their past
    invoices with download links, pulled live from Stripe.
  - `features.customer_update.allowed_updates` including `"tax_id"` — lets
    the customer self-enter a VAT/tax ID (and, separately, `"address"` /
    `"name"` if the billing name/address should be editable too), which then
    prints on **future** invoices.
- `VAT_StripeTax_Scope.md` (parent-folder scope, not built) covers automatic
  VAT calculation/reverse-charge at checkout — a separate, heavier concern.
  This ask is narrower: just capturing the number for the customer's own
  paper trail, not making SignedBy calculate or validate VAT. The two are
  independent; this doesn't require that one to ship first.

## Recommended approach: reuse the existing portal, don't build a parallel one

Given the "leanest, cheapest to run" brief, building a custom invoice-list UI
and a `vat_number` column+form+Stripe-sync route would duplicate something
Stripe already does correctly, for free, with better compliance guarantees
(Stripe's invoice PDFs are the ones tax authorities expect; a home-grown
render of the same data is more surface area for less value). Two changes,
both small:

1. **One-time Stripe configuration change** (I can do this via the API,
   `stripe.billingPortal.configurations.update()`/`.create()` — not a Dashboard
   click): enable `customer_update` with `allowed_updates: ["tax_id",
   "name", "address"]` on the org's active portal configuration.
   `invoice_history` is on by default once the Customer Portal is activated,
   but worth explicitly confirming rather than assuming.
2. **Settings page**: add a "Billing & tax" line — a short sentence
   ("Download past invoices or add a VAT number for your records") plus a
   button that hits the *same* `/api/billing/portal` endpoint that already
   exists, placed directly in Settings rather than requiring the extra hop
   through `/dashboard/billing` it takes today. No new API route, no new
   table, no new webhook handling.

This gets both stated requirements (download last invoice, enter optional
VAT number) live with a config change + a few lines of UI, not a new feature
build.

### One real caveat to flag before building

Stripe does not retroactively rewrite an already-issued invoice. If a
customer adds their VAT number *after* their last invoice was generated,
that specific PDF won't show it — it'll appear on the *next* one. Worth a
one-line note next to the VAT field in the UI ("Applies to future invoices")
so it doesn't read as a bug when someone checks their last invoice
immediately after adding a number.

### Gate not required, but worth naming

`org?.stripe_customer_id` is already the existing gate on `ManageBillingButton`
(no Stripe customer yet = nothing to show) — the new Settings entry should
use the same check, so a still-on-Free org sees no dead button.

## Alternative (not recommended): fully in-house

For completeness, in case Michael wants the customer to never leave
signedby.ai for this: a `vat_number` column on `organizations`, a small form
component, a save handler that calls Stripe's Tax ID API
(`stripe.customers.createTaxId(customerId, { type, value })` — note this
needs a specific tax ID *type* per country, e.g. `eu_vat`, not a free-text
field, adding real validation surface), and a `GET
/api/billing/last-invoice` route that does
`stripe.invoices.list({ customer, limit: 1 })` and redirects to
`invoice.invoice_pdf`. Fully white-labeled, but meaningfully more code and
more to maintain for the same end result the portal already gives for free —
only worth it if leaving signedby.ai for this one action is a real problem,
which hasn't come up as a concern so far (the existing "Manage billing"
button already sends customers to the same Stripe-hosted portal today for
plan changes).

## Decisions (2026-07-28)

1. Portal reuse (recommended above) — confirmed.
2. `name`/`address` also made customer-editable alongside `tax_id`, not just
   `tax_id` alone.
3. No objection to me updating the live Stripe billing portal configuration
   directly via the API.

## What shipped

- `src/components/manage-billing-button.tsx` — took an optional `label` prop
  (defaults to "Manage billing", so the existing `/dashboard/billing` caller
  is unchanged) instead of a hardcoded string, so it can be reused with
  different call-to-action copy.
- `src/app/dashboard/settings/page.tsx` — new "Billing & tax" card, placed
  directly above "Plan & team". Uses the same `ManageBillingButton` (so it
  opens the identical Stripe-hosted portal, no new route), labeled "Download
  invoices & add VAT number", gated on `org.stripe_customer_id` the same way
  the existing billing page already gates its button — a still-on-Free org
  sees "Available once you're on a paid plan." instead of a dead button. Adds
  a one-line note in the card description that changes apply to future
  invoices, not ones already issued (the retroactivity caveat from the scope
  above).
- `scripts/update-stripe-portal-config.js` (new) — one-off script using the
  already-installed `stripe` SDK. Reads the account's current default portal
  configuration and merges in `invoice_history.enabled: true` and
  `customer_update: { enabled: true, allowed_updates: ["tax_id", "name",
  "address"] }`, preserving every other existing feature on that
  configuration untouched (payment method update, subscription cancel,
  etc. — whatever's already configured). Creates a new configuration only if
  none exists yet.
- Verified: `tsc --noEmit`, `eslint` (both changed files clean), full vitest
  suite (496 tests, all passing, no regressions).

## Still to do — one step only Michael can run

The script above **could not be run from the sandbox this was built in**:
outbound requests to `api.stripe.com` are blocked by the sandbox's network
proxy (`curl https://api.stripe.com/...` returns `403 from proxy after
CONNECT`) — this is the same class of restriction noted before for other
third-party APIs, not specific to this change. Everything else about this
feature (the Settings UI, the button, the gating) is already live once
deployed; only the Stripe-side configuration change is outstanding.

Run once, from a machine with normal internet access:

```
cd signedby-app
export $(grep STRIPE_SECRET_KEY .env.local | tr -d ' ')
node scripts/update-stripe-portal-config.js
```

It prints the resulting `features` object on success. Safe to re-run — it
merges rather than overwrites, so running it twice is a no-op the second
time.
