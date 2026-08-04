# /verify page: client-facing growth CTA — scope

Status: SCOPED 2026-08-03, not built. Direct ask: below the green
verified result on `/verify`, add a section aimed at the client
checking the document: "Are you signing more documents, hiring other
contractors? Ensure all your deliverables are secure. [Invite your
team to require SignedBy.AI]"

## The finding that changes this scope: there's an existing, hard rule about exactly this kind of CTA, and it applies here

`SIGNER_GROWTH_CTA` (shipped 2026-07-12, extended 2026-07-15) added a
"Create your free SignedBy account" pitch to signer-facing dead-end
screens, then hit the same question this request raises: is it okay to
show SignedBy's own growth pitch to someone who isn't the paying
customer? The answer that shipped was no, not unconditionally — the
CTA is gated on `!hasBranding` (`planHasFeature(org.plan,
"customBranding")`), because a signer sent a document by a
Business/branding-tier customer must never see an ad for SignedBy
pitched against the white-label experience that customer paid to
create. The rule as written at the time: *"any future signer-facing
surface added to the sign flow... should default to checking
`hasBranding` before adding any SignedBy self-promotion."*

`/verify` isn't the sign flow, but the relationship is identical:
whoever pastes a hash into `/verify` is, in the overwhelming majority
of cases, the client or counterparty of whichever org sent that
document — the exact same audience the signer-CTA rule was written to
protect. A branding-tier customer pays to keep their own document
exchange white-labeled; showing that customer's own client a "require
SignedBy.AI" pitch on the verification page for their document
undercuts that in the same way the signer dead-end screens would have.

**This needs the same gate.** `/api/verify/route.ts` doesn't currently
fetch the sending org's plan — its `documents` query selects
`org_id, organizations(name)` only. Adding `plan` to that same select
and computing `hasBranding: planHasFeature(plan, "customBranding")`
(the identical helper call used in `sign/[token]/page.tsx` and
`signing-view.tsx`) is a small, contained addition — no new query, no
migration, just one more column in an existing join plus one new field
in the JSON response. The new UI block then only renders when
`!result.hasBranding`, exactly mirroring the signer version.

## Placement

The request says "below the green ✅ Document Verified checkmark" —
worth noting the page doesn't currently have that literal text. The
two live success states are "✓ Sealed and identity-verified" (Verified
Badge branch) and "✓ This document is genuine" (generic branch,
`verify/page.tsx` lines 120–192). Not a blocker, just flagging so the
right elements get found at build time. The CTA reads naturally in
both branches — the pitch ("more documents, more contractors, keep
deliverables secure") applies equally whether or not this specific
document used Verified Badge — so it should render once, right after
the existing `<dl>` content, in whichever branch is active, gated on
`!result.hasBranding` in both places.

## Two open questions worth deciding before building, not assumed here

**1. "Invite your team" — literal feature or just CTA copy?** The
existing org-invite system (`admin-role-management`) invites someone
*into your own org*, requires an authenticated admin session, and
isn't reachable from an anonymous public page. Read literally, "invite
your team" here almost certainly means the CTA copy encouraging the
client to go tell their own colleagues about SignedBy — not a literal
multi-email invite form living on `/verify`. The natural, small
version is a single "Sign up free" / "Learn more" link; a real
multi-invite composer (enter teammates' emails, send from `/verify`
itself) would be materially bigger scope and needs its own decision if
that's actually wanted.

**2. Does this link tie back to the sending org at all?** SignedBy
already has two different "someone brings in someone else" mechanics —
[[referral-loop]] (existing customer refers a new paying org, both get
a free month) and [[referral-seal-credits]] (Free-tier seal-credit
referral program). Neither fits this moment cleanly: the person
clicking this CTA is a first-time visitor with no account, and the
"referring" party would technically be the sending org, who did
nothing to prompt this click. Simplest, and what's assumed by default
here: a plain, UTM-tagged signup link
(`utm_source=verify_page&utm_medium=growth_cta&utm_campaign=verify_to_signup`,
matching the pattern already used for the sign-flow decline CTA so
this flows into [[signup-attribution]] the same way) — no referral
credit to the original sending org. If Michael wants the sending org
to get referral credit when their own client signs up this way, that's
a bigger addition (needs an org-identifying referral code embedded in
the link) and should be called out explicitly as its own follow-up
rather than assumed into this build.

## What this actually needs, mechanically

- `src/app/api/verify/route.ts`: add `plan` to the existing
  `organizations(...)` select, compute `hasBranding` via
  `planHasFeature`, add it to the JSON response. No migration.
- `src/app/verify/page.tsx`: add `hasBranding: boolean` to the `Result`
  type; add one new CTA block, rendered in both verified branches,
  gated on `!result.hasBranding`.
- A UTM-tagged link (signup page or a dedicated landing page) per open
  question 2 above.

No backend logic beyond the branding-flag plumbing, no new page, no
migration. Comparable in size to the sign-flow decline-screen CTA
addition from 2026-07-15.

## Explicitly out of scope

- **A literal multi-person invite composer on `/verify`** — see open
  question 1; only in scope if Michael confirms that's actually wanted
  over a simple signup link.
- **Referral credit to the sending org** — see open question 2; a
  separate, bigger addition if wanted.
- **Any change to what `/verify` discloses about a document** — this
  is a CTA addition below the existing result card, not a change to
  the verification data itself.

## Effort

Small, once the two open questions are answered. The branding-gate
plumbing is the only real engineering piece and it's a direct copy of
an existing, proven pattern — not new design work.

---

## Addendum: "Client Receiver" free account — a bigger, separate feature

Second ask, layered onto this same request: instead of (or alongside)
the plain CTA above, offer a free "Client Receiver" account, prompted
right when a client's document comes back verified, to "Store and
manage your verified IP."

**This is materially bigger than the CTA-link version above — flagging
that up front so it isn't accidentally built as if it were the same
size.** The CTA-link version needs one API field and one UI block. This
needs a genuinely new capability: right now there is no way to
associate a verified document with anyone's account. `/verify` is
fully anonymous and stateless — it takes a hash, returns facts, keeps
no record of who asked. Checked the schema for any existing link
between a signer and a user account (grepped for
signer-to-`user_id` patterns) — there isn't one; the closest existing
thing, [[signer-growth-cta]], just points a signer at plain signup,
it doesn't give them anywhere to see documents afterward. "Store and
manage" is a real, new library feature, not copy on an existing page.

**What it actually requires:**
- A new table linking a user account to the specific document
  hashes they've verified (something like
  `verified_document_saves(user_id, document_hash, saved_at)`) —
  needs a migration.
- A moment to actually save the association — most likely: client
  verifies a document → sees the CTA → signs up or logs in → the
  hash they just checked gets saved to their account automatically
  (carrying the hash through the signup redirect, similar to the
  `next`-param plumbing already used for [[free-template-landing-pages]]).
- A new page/dashboard view listing a Client Receiver account's saved
  verifications — separate from the existing sender-side "Documents"
  workspace, since these are documents this account never sent, only
  checked.
- A decision on whether "Client Receiver" is an actual distinct
  account type (different plan, different dashboard, different nav)
  or just onboarding copy layered on the existing Free plan reused
  from a different entry point — the former is a meaningfully bigger
  build (new role in [[team_business_tier_features]]'s plan model,
  a second dashboard shell) than the latter (tag the signup source,
  same account and dashboard everyone else gets, just a different
  first-run message). Not deciding this here; it changes the estimate
  by roughly an order of magnitude.

**The "verified IP" wording repeats a problem already flagged twice
this session.** [[verify-certificate-download-scope]] flagged "IP
Certificate" and [[agency-pitch-badge-scope]] flagged "IP protection"
— both for the same reason: "IP" reads as *intellectual property* in
a compliance/legal context, and SignedBy doesn't register, certify, or
protect intellectual property; sealing proves a file is unaltered and
identity-verified, nothing about IP ownership. "Manage your verified
IP" has the identical problem a third time. Given the pattern — three
separate requests reaching for "IP" language — worth asking directly
rather than assuming: is this deliberate positioning (leaning into "IP
protection" as a market category on purpose, accepting the ambiguity),
or would plain language ("Store and manage your verified documents")
say the same thing without the intellectual-property implication? Not
correcting this unilaterally a third time — flagging it plainly and
leaving the call to Michael.

**What this could look like if kept accurate and small:** a genuine,
useful hook — "Create a free account to keep a record of every
document you've verified, in one place" — is a real value prop
(a personal audit trail for a contractor/freelancer who receives
signed agreements from many different clients) and doesn't need "IP"
framing to land.

### Explicitly out of scope (addendum)

- **Any change to sender-side accounts or the existing Documents
  workspace** — this is a new, separate view for a new class of user.
- **Auto-discovering documents a client has received without them
  visiting `/verify` and checking a hash first** — e.g. scanning email
  or matching by recipient address — not proposed, would be a much
  larger privacy/scope question on its own.

### Effort (addendum)

Medium if "Client Receiver" reuses the existing Free plan and account
system with new onboarding copy and a new saved-verifications table.
Larger if it's meant to be an actual distinct account type/tier with
its own dashboard shell — worth pinning down which one before
estimating further.

Per [[feedback-scope-means-scope-only]]: scope only, not approval to
build.
