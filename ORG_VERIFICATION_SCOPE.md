# Organization verification — scope

Status: **scoped 2026-08-13, not built.** Answering the open questions below
is not approval to build — see [[feedback-scope-means-scope-only]].

**Direction (2026-08-13): both mechanisms, sequenced.** Domain control first
(cheap, broad, reaches sole traders), Stripe business verification second
(paid, deeper claim, reaches registered companies). They address different
populations, which is why one doesn't replace the other.

## Why — and why there's no urgency

The sealed-badge verify panel lost its `Organization` row today (`4c3f4ba`):
it was free user text inside a green verification panel, so a scammer could
name their workspace after the supplier they were impersonating and have the
page appear to corroborate them.

**That hole is already closed.** Everything here *adds a verified claim back*;
none of it repairs anything. There is no live vulnerability waiting on this
work, so it can be sequenced behind demand rather than ahead of it.

Note in passing: **not a TFN.** Australian Tax File Numbers are confidential
identifiers with their own privacy regime and must never be collected. ABN is
the public identifier if a registry route is ever added.

## Why both

| | Domain control | Stripe business verification |
|---|---|---|
| Reaches | anyone owning a domain, **including sole traders** | registered legal entities only |
| Proves | control of the domain on the invoice | entity is real **and** this person is a verified representative |
| Cost | ~free (reuses existing login proof + DNS) | per check |
| Friction | none (Tier 1) / low (Tier 2) | high — company documents |
| Catches | lookalike-domain attacks specifically | impersonation of a registered company |

SignedBy's stated ICP is "solo professionals and small teams." A freelancer
trading under their own name **has no entity for Stripe to verify** — that
group is only reachable by domain control. Conversely a registered company
gets a far stronger claim from Stripe than a domain alone can support. Neither
covers the other's population.

---

## Part 1 — Domain control (build first)

Proves the org controls the domain on its invoices, displayed as "verified
control of northwindstudio.com". Maps directly onto how invoice fraud actually
operates: the standard attack uses a lookalike domain
(`northwind-studio.com` vs `northwindstudio.com`), which a recipient
comparing against a verified domain catches immediately.

### The shortcut that makes Tier 1 nearly free

Every login already goes through the magic-link / 6-digit-code flow, which
proves control of that mailbox. For any org whose account email is at its own
domain, **domain control is already established at every sign-in** — it simply
isn't recorded or displayed.

Needs:
- A **consumer/free-provider exclusion list**. "Verified control of gmail.com"
  is absurd and actively misleading. Short static list (gmail, outlook,
  hotmail, live, yahoo, icloud, proton, gmx, aol, …), hand-maintained — unlike
  `disposable-email.ts`, which rightly uses a maintained community feed. This
  list is small and stable enough not to warrant a dependency.
- A decision on **which member's email counts** — almost certainly the org
  owner's, since a Team-tier org can have members on mixed domains.
- Columns on `organizations`: `verified_domain`, `verified_domain_at`,
  `verified_domain_method` ('account_email' | 'dns').

### Tier 2 — explicit DNS TXT

For orgs on consumer email that still own a business domain. Owner enters a
domain in Settings → SignedBy issues `signedby-verification=<random>` → they
add a TXT record → SignedBy resolves and confirms.
`lib/validate-email-domain.ts` already resolves DNS with Node's built-in
resolver (`checkEmailDomainHasMx`), so the pattern and its fail-open posture
are established. Re-check monthly so a lapsed or transferred domain doesn't
keep asserting itself.

### Measure before building

Most solo freelancers use Gmail. If the base is overwhelmingly consumer
addresses, Tier 1 displays nothing for nearly everyone and Tier 2 becomes the
actual product:

```sql
select case
         when split_part(lower(u.email),'@',2) in
           ('gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com',
            'live.com','proton.me','protonmail.com','gmx.com','aol.com')
         then 'consumer' else 'own domain' end as kind,
       count(*)
from auth.users u
group by 1;
```

### Limit

Proves control of a mailbox or DNS — **not** entitlement to invoice. A former
employee with a live mailbox still passes.

---

## Part 2 — Stripe business verification (build second, paid tiers)

**Why it fits.** Stripe is already live for payments (2026-07-14) and Stripe
Identity already performs the individual KYC behind every Verified Badge seal.
Account, SDK, webhook handling and the redirect-out-and-return UX pattern all
exist. Reuses a vendor already in the stack, so no new sub-processor entry on
`/privacy` and `/dpa` —
[[feedback-update-legal-pages-with-new-processors]] would otherwise apply.

**What it establishes**, and why it's stronger than a registry lookup: Stripe's
KYB doesn't merely confirm a company exists on a register. It verifies the
individual as a **representative** of that entity, including control/ownership
structure, because that's what payment processors need for AML. A bare
registry lookup (VAT number, company number) is worthless on its own — anyone
can type a competitor's public company number.

**Where it earns its keep:** the United States. No national registry,
state-by-state filings, EIN not publicly verifiable. Free registries (VIES for
the EU, Companies House, ABN Lookup) cover NL, DE, IE, UK and AU for nothing
but stop dead at the US.

**Confirm current product boundaries first** — Stripe's KYB capability has
moved between products over time (Connect onboarding; Identity extending
toward businesses). Check present docs rather than trusting this note.

**Costs.** Per-check fees, and real friction on a product that sells thirty
seconds and no card. Must be **opt-in and gated behind a paid tier** — never
on the path of a first seal. Cost then lands on orgs already paying and it
becomes an upgrade reason rather than a margin leak.

---

## Display

Keep claims separate and individually checkable. Never merge into one
"verified business" badge:

> Sealed by **[identity-verified name]**
> verified control of **northwindstudio.com**
> **Northwind Studio B.V.** — business verified

Each line says exactly what was checked. All should carry an "as of" date,
matching the existing "Identity verified on" row, since both domain control
and company control change over time.

## Open questions

- Domain: owner's email only, or any member's? (Leaning owner-only.)
- Domain: does a Tier 1 domain need owner confirmation before display, or is a
  verified login enough?
- Stripe: which tier — Pro, or Business only?
- Re-check cadence for both, and what the panel shows when a check lapses:
  hide the claim, or show it as stale?
- Does the verified entity name replace the identity-verified individual name
  as the headline, or sit beneath it? (Leaning beneath — the individual is the
  more directly-checked claim.)
- Show any of this on the non-badge "Sent via" result, or only the
  sealed-badge panel where identity claims are already being made?
