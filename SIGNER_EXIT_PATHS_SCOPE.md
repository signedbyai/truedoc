# Signer exit paths — scope

Status: **scoped 2026-08-13, not built.** Answering the open questions below
is not approval to build — see [[feedback-scope-means-scope-only]].

## Why this exists

Direct ask, 2026-08-13, following the `/verify` back-link fix (`ac18cc3`):

> "so in the most common denominator where the signer is not a SignedBy user,
> if they hid the back to SignedBy, would they be bounced to the login or the
> homepage? Can we make the flow for final signed exit paths by type of signer
> so we know the options."

Immediate answer to the first half: **the homepage, never login.**
`verify/page.tsx`'s `backHref` falls through to `"/"` when no `from` param is
present; no branch in that logic points at `/login`.

The second half turned up a gap worth more than the original question — see
"The gap" below.

## Signer types

| # | Type | How to detect | Notes |
|---|------|---------------|-------|
| 1 | Non-user signer, standard org | No session; sender's plan lacks `customBranding` | **The most common case.** SignedBy branding visible throughout. |
| 2 | Non-user signer, branding-tier org | No session; `planHasFeature(org.plan, "customBranding")` | White-labelled. All growth CTAs deliberately suppressed — the counterparty should associate the moment with the customer's brand, not SignedBy. |
| 3 | Signer who already has a SignedBy account | Has a session, but the signing flow never checks | Currently indistinguishable from type 1 — the signing flow is session-agnostic by design (a signer shouldn't need an account). |
| 4 | Sender self-signing (Seal / Verified Badge) | Authenticated, dashboard flow | Different flow entirely (`verified-badge-actions.ts`); already handled — `from=dashboard&doc=<id>` returns them to their document. |
| 5 | Third-party QR scanner | Arrives at `/verify` cold, no `from` param | Not a signer. Received the document later (e.g. accounts payable checking an invoice). |

## Current exit paths, by screen

### A. Signed screen — `signing-view.tsx` (~line 915-1045)

The screen a signer lands on immediately after submitting.

| Element | Types 1 & 3 | Type 2 (branding) | Condition |
|---|---|---|---|
| Org logo | — | shown | `hasCustomBranding && hasLogo` |
| Download signed PDF | shown | shown | always |
| "This document is certified" + QR | shown | shown | `documentCompleted && documentHash` |
| "Verify this document" link | shown | shown | same |
| Pay now | shown | shown | `payment_link_url` set |
| DocGate link | shown | shown | `documentCompleted && docgate` |
| **Growth CTA** | **none** | **none** | — |

### B. Declined screen — `signing-view.tsx` (~line 884-913)

| Element | Types 1 & 3 | Type 2 |
|---|---|---|
| "Prefer to send your own agreement?" → `utm_source=signer_decline` | shown | suppressed |

### C. StatusScreen — `sign/[token]/page.tsx` (~line 258-310)

Covers: Already signed · Signing declined · Document declined · No longer
available (voided) · This link has expired.

| Element | Types 1 & 3 | Type 2 |
|---|---|---|
| "Need to send or sign documents yourself?" → `utm_source=signer_status_screen` | shown | suppressed |

### D. `/verify` — `verify/page.tsx`

| Arrived from | Back control | Destination |
|---|---|---|
| `from=console` | "← Back to console" | console app |
| `from=dashboard&doc=<id>` | "← Back to document" | that document |
| `from=signer` (as of `ac18cc3`) | **none** | — |
| no param (QR/badge scan, type 5) | "← SignedBy" | marketing homepage |

## The gap

**The Signed screen is the only dead-end in the signer funnel with no path to
SignedBy at all** — and it's the highest-intent one. A signer who just
successfully completed a document has experienced the product working. A
signer who *declined* gets offered a signup link; a signer who arrives late to
an already-signed document gets offered one. The signer who actually succeeded
gets nothing.

Until `ac18cc3` there was one accidental path: the verify link opened
`/verify`, whose default "← SignedBy" control led to the marketing homepage.
That fix removed it — correctly as a UX matter (the link opens with
`target="_blank"`, so a "back" affordance in a tab with no history is
misleading) but it closed the surface without replacing it. Net effect today:
**zero outbound product path from the successful-signing screen.**

Worth noting the existing growth CTAs don't point at the bare homepage either
— they point at `/login?intent=signup&utm_source=…&utm_medium=growth_cta&utm_campaign=signer_to_sender`,
i.e. a tagged signup link. So "homepage" was never the designed destination
for a warm signer; it was just the fallback nobody had tagged.

## Options for the Signed screen

Not mutually exclusive; roughly ascending in effort.

1. **Add the existing growth CTA pattern to the Signed screen.** Reuse the
   Declined screen's block verbatim with a new `utm_source=signer_signed`, and
   the same `!hasCustomBranding` gate. Consistent with two existing
   touchpoints, attributable on day one, and closes the gap directly.
   Copy would need to suit the moment — a signer who just succeeded is a
   warmer, less awkward audience than one who just declined.

2. **Restore an outbound path on `/verify` for `from=signer`** — instead of
   showing nothing, show the tagged growth CTA rather than a "back" link.
   Sidesteps the target="_blank" problem (it isn't pretending to be
   navigation) while recovering the surface.

3. **Differentiate type 3 (existing account holders).** Today they see the
   same signup CTA as a stranger. Detecting a session on the Signed screen and
   swapping to "Go to your dashboard" would stop showing a signup prompt to
   people who already signed up. Requires the signing flow to become
   session-aware, which it deliberately is not today — so this is the biggest
   change of the three and the one most likely to have side effects.

## Constraints that must hold

- **Type 2 stays suppressed.** Branding-tier customers pay for white-label;
  any new CTA inherits the `!hasCustomBranding` gate without exception.
- **No added friction in the signing flow itself** —
  [[feedback-no-friction-in-signing-flow]]. These are all post-completion
  screens, so this is satisfied by construction, but any temptation to
  interrupt *before* completion is out of scope.
- **Anything new must be UTM-tagged** at creation, not retrofitted, per
  [[signup-attribution]] — and now that attribution survives the browser hop
  (`fd579c9`), a tagged CTA here would actually be measurable, which it
  wouldn't have been a week ago.

## Open questions

- Does the Signed-screen CTA risk cheapening the moment? The counterargument
  to option 1 is that a signer who just signed a contract for someone else may
  find an immediate upsell tonally off. The Declined screen's own comment
  already worries about this ("kept secondary… so it never reads as pushy at
  an awkward moment") and solves it with placement rather than omission.
- Should type 5 (cold QR scan) keep pointing at the marketing homepage, or
  also get a tagged link? It's currently the only untagged entry point left,
  so any signups it produces are invisible.
- Is "Sign up" even the right ask for a signer, or is the more natural next
  step "verify another document" / "see how this works"?
