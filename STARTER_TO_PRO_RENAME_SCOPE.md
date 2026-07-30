# Scope: rename "Starter" tier to "Pro"

Status: SCOPED, NOT BUILT. Waiting on explicit go-ahead.

## Recommendation: rename the label only, keep the internal identifier

`starter` is not just UI copy — it's the literal string stored in `documents.plan`
type places (DB check constraint, `PlanId`/`PlanKey` TypeScript unions, Stripe
price env var names). Two ways to do this rename:

**A. Label-only rename (recommended).** Change every customer-facing string
"Starter" → "Pro". Leave the internal identifier `"starter"` untouched in the
DB column, TypeScript types, feature-gate arrays, and Stripe env var names.
Zero DB migration, zero Stripe price/product re-linking, zero webhook risk —
this is a copy change plus one label map. Lowest-risk, matches the "leanest"
brief.

**B. Full identifier rename** (`starter` → `pro` everywhere, including the DB
check constraint and Stripe env vars). More "correct" long-term, but touches
a `check (plan in (...))` constraint on two tables (needs a migration + backfill
of existing rows), renames 4 env vars per currency (`STRIPE_PRICE_STARTER*` →
`STRIPE_PRICE_PRO*`, 4 currencies = 4 vars) that must be updated in Vercel in
lockstep with the deploy or checkout breaks mid-flight, and touches Stripe
webhook handlers that may branch on the string. No functional upside over A
unless you specifically want the internal name to match the UI for future
engineer clarity.

Unless you have a specific reason to want B, go with A.

## Every place "Starter" needs to change (Option A)

**Pricing/marketing copy:**
- `src/components/pricing-cards.tsx` — plan name, blurb, "Everything in
  Starter" cross-reference on the Team card
- `src/lib/homepage-content.ts` — `{ name: "Starter", id: "starter", ... }`
- `src/app/vs/docusign/page.tsx`, `vs/signnow`, `vs/pandadoc`, `vs/bolosign`,
  `vs/hix` — "Included (Starter+)" appears twice per file in feature rows
- `src/app/pricing/page.tsx` — check for any inline "Starter" mentions beyond
  the shared `PricingCards` component

**App/dashboard copy:**
- `src/lib/plan.ts` — `PLAN_LABEL.starter` display string (the single source
  of truth other pages pull from — most call sites already read through this,
  so most of the app updates automatically once this map changes)
- `src/app/dashboard/settings/page.tsx`, `dashboard/billing`,
  `dashboard/templates`, `ai-drafter/page.tsx` — check for any hardcoded
  "Starter" strings that bypass `PLAN_LABEL`

**Stripe (billing, needs Michael — not scriptable from the sandbox):**
- Rename the Product's display `name` in the Stripe Dashboard (this is what
  shows on customer invoices, the customer billing portal, and email
  receipts) for all 4 currency variants. Price IDs stay the same — no need
  to create new Prices or touch existing subscriptions.
- Leave `STRIPE_PRICE_STARTER`/`_EUR`/`_GBP`/`_CHF` env var names alone
  (Option A) — they're internal plumbing, invisible to customers.

**Not touched:** `PlanId`/`PlanKey` TypeScript unions, `FEATURE_PLANS` gate
arrays, DB check constraints, referral/template/quote code that branches on
the `"starter"` string — all keep working unchanged since the identifier
doesn't move.

## Build estimate
Under an hour of code changes (mostly `PLAN_LABEL` + copy edits across
~8 files) plus a few minutes in the Stripe Dashboard for Michael. No
migration, no downtime, safe to ship straight to prod after a dev smoke test.

## Open question
None blocking — Option A is safe to build as soon as you say go.
