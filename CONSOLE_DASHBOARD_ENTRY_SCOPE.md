# Console entry point on the main dashboard — scope

Status: SCOPED — DECISIONS LOCKED, NOT BUILT. Nothing in `dashboard-nav.tsx`
or `dashboard/layout.tsx` touched yet — waiting on an explicit build
instruction per this project's standing rule that answering a scope doc's
open questions isn't itself approval to build.

**Decision (2026-08-04, Michael) — updated, supersedes the earlier "B2 first,
C later" phasing:** B2 (account menu entry, above Settings, shown to
everyone including Free) **plus** C (home-page discovery card), both now in
scope together — not phased. C is confirmed to show **only one time**, and
its job is to explain what **both** Verified Badge and Console are, not just
point at Console alone. Free-plan users landing in Console via B2 get a
Verified-Badge-specific pitch once they're there — already built (see
decision 4 below), no new work needed for that part; C is the piece that
gets them there in the first place, once, with real explanation rather than
just a bare link.

## Current state (grounded in code, not memory)

Checked both files directly rather than trusting prior session notes, since
this area has a long rollback history:

- `dashboard/layout.tsx` line 56: **`const showConsole = false;`** — hardcoded
  since 2026-07-30, direct instruction ("Michael wants /dashboard/console
  findable only by going straight to console.signedby.ai while it's still
  early, not surfaced in the nav"). The real eligibility check right above
  it (`eligibleForConsole = apiAccess || consoleAccess`, i.e. Pro+) is
  computed and then explicitly discarded (`void eligibleForConsole;`).
- `dashboard-nav.tsx` already has a `CONSOLE_SECTION` entry (cross-host link
  to `https://console.signedby.ai/app`) that gets appended to the primary
  tab list — top bar **and** mobile floating pill — whenever `showConsole`
  is true. This is fully built and simply unused today.
- The account dropdown (desktop) and "More" sheet (mobile) — today's only
  other nav surfaces — have exactly three items each: Settings, Billing,
  Log out. No Console entry anywhere in either.
- Settings' Integration & API card also deliberately has no link to
  `console.signedby.ai`, same date, same reasoning, confirmed in
  `settings/page.tsx`'s own comment.

**Net: there is genuinely zero in-app path from the dashboard to Console
today.** Someone has to already know to type the subdomain directly. That's
consistent with what you're seeing, not a case of "it's there somewhere and
hard to find."

## One dependency worth flagging before any of this matters

Console itself (`CONSOLE_UX_SCOPE.md`) is built but **not deployed** — a
17-commit unpushed chain, two pending migrations (`0040`/`0041`), and an
unconfirmed `MISTRAL_API_KEY` in Vercel (see `MASTER_BACKLOG.md`, corrected
2026-08-04). Adding a nav entry now would point real users at something not
live in production. Doesn't change any option below — just worth deciding
whether to build+ship this alongside that deploy, or land it now so it's
ready to flip the moment Console goes live.

## Options

### A — Flip on the existing primary-tab entry (top bar + mobile pill)
Already coded. The whole change is `const showConsole = eligibleForConsole;`
in `dashboard/layout.tsx` (plus deciding the gating question below).

- **Pros:** cheapest possible option — real estate and the link both already
  exist. Matches the *original* design intent; this is what `CONSOLE_SECTION`
  was built for before being deliberately hidden.
- **Cons:** the most prominent placement available — a permanent tab next to
  Documents/Templates/Team for every eligible org, whether or not they've
  ever touched Console. Highest-commitment option of the four.

### B — Account menu entry (the two placements you're weighing)
Lives in both the desktop dropdown and the mobile "More" sheet — both would
need the addition for parity, since they carry the same three items today.

- **B1 — between Settings and Log out** (i.e. after Billing, before the
  divider). Reads as "another destination, similar weight to Settings/
  Billing." Unremarkable, fine for someone who already knows to look for it;
  doesn't read as promoted.
- **B2 — above Settings** (first item in the menu). Reads as elevated/
  promoted — the first thing visible on open. Better for active discovery
  (someone who doesn't know Console exists yet); slightly odd if Settings is
  what most people actually open that menu for most of the time.
- **B3 — between Settings and Billing** (not one of your two, but worth
  naming): middle ground — visually separated from the exit action at the
  bottom without claiming the very top slot either.

- **Pros overall:** lower commitment than a permanent tab, doesn't compete
  with Documents/Templates/Team for top-bar space, a natural home for
  "other account-level stuff" alongside Settings/Billing.
- **Cons overall:** one click deeper than a tab — worse for someone who
  hasn't discovered Console yet and isn't already in the habit of opening
  the account menu.

### C — Home-page discovery card
A dismissible card on `/dashboard`, same established pattern as
`ReferralCard` (already live there today). A one-time or dismiss-once push
rather than a permanent nav element.

- **Pros:** strong initial discovery moment, doesn't permanently spend nav
  real estate, reuses a pattern already proven in this codebase (also see
  the empty-state Verified Badge promo).
- **Cons:** doesn't solve "come back and find it again later" — once
  dismissed, back to zero in-app path unless paired with A or B.

### D — Hybrid (worth considering if the goal is real discovery, not just technical reachability)
Home-page card (C) for the initial push + a persistent, low-prominence
account-menu entry (B) for the durable path, skip the permanent top-bar tab
(A) until there's real evidence Console gets used often enough to earn that
level of real estate.

## Gating question — the "Pro+ only" assumption is now half-stale

Both the 07-30 hardcode reasoning and `eligibleForConsole` assume Console is
Pro+-only (`apiAccess || consoleAccess`). That's no longer fully true:
`CONSOLE_FREE_TIER_SCOPE.md` shipped Free-tier console access specifically
for Verified Badge sealing (the chat/bulk-send tools still need templates,
which stay Pro+-only in practice). So "should Free-plan orgs even see this
nav entry" isn't a clean yes/no anymore:

- **Show to everyone, Free included** — closer to how Templates/Reminders
  already get a muted "(Starter+)" upsell tease rather than being hidden
  outright for ineligible plans. Free genuinely has *something* to do in
  Console now (sealing).
- **Keep hidden for Free**, matching today's `eligibleForConsole` logic
  exactly, and let Free's console-sealing path be reached some other way
  (e.g. directly from the Verified Badge flow) rather than the main nav.

## C's design, now that it's in scope

**"Only one time," matched to an existing pattern already in this codebase
rather than inventing a new mechanism:** `ReferralCard` (`referral-card.tsx`)
already does exactly this — a client-side `localStorage` flag
(`sb_ref_card_dismissed`) set on dismiss, checked on mount, card renders
`null` once set. No migration, no DB column, no server round-trip. C should
copy this shape (`sb_console_promo_dismissed` or similar) rather than the
org-level DB-column approach `console_cap_intro_seen_at` uses inside Console
itself — that one's DB-backed because it needs to survive across devices for
a paid feature's onboarding; a homepage awareness card doesn't carry that
bar. Simplest option that matches this decision ("only one time") and an
existing precedent.

**Content — explains both things, not just "go to Console":** two short
beats, not one — (1) what Console is (chat-driven send/bulk-send/status from
console.signedby.ai, Pro+ for the full set), (2) what Verified Badge is and
that it's the part every plan, Free included, can actually use today. Given
decision 4's finding that Console's own empty state already leads with
Verified Badge for Free orgs specifically, C's copy should set up that same
distinction up front rather than re-inventing a different framing — whoever
reads the card and then clicks through should find the destination saying
the same thing the card just told them, not something else.

**Final copy, mocked up and approved 2026-08-04 — two plan-gated variants:**

- **Free:** "Claim your free Verified Badge" / "Stand out to clients — seal
  your first file to generate cryptographic proof it's unaltered and
  identity-verified."
- **Pro and up:** "Generate your Verified Badge" / "Seal a file to lock in
  its cryptographic hash. We'll generate a Verified Badge you can attach to
  invoices, deliverables or datarooms."

**Two overclaims caught and rewritten before landing here, worth recording
so they don't resurface:** the first drafts read "prove your work is 100%
human-crafted" (Free) and "Generate your Proof of Work" (Pro+). Both were
rejected — the first directly contradicts `/verified-badge`'s own live FAQ
("Does this prove my work wasn't made with AI? No — and it doesn't claim
to.") and repeats the exact phrase ("100% human-driven quality") already
flagged for rewrite in `AGENCY_PITCH_BADGE_SCOPE.md` three days earlier;
"Proof of Work" is a real, unrelated cryptography term (Bitcoin-mining
computation) that the same doc already flagged as a factual-error risk, not
marketing color. What the badge actually proves — unaltered file + verified
identity — is the claim both final headers below make instead. "Datarooms"
in the Pro+ line was checked too: it describes a place a customer might put
*their own* sealed file, not a SignedBy feature — this product has twice
evaluated and declined to build an actual dataroom product
([[document-verification]] backlog notes), so this line isn't implying
otherwise.

**Placement, matching the existing home-page card precedent:** same
`/dashboard` page, alongside `ReferralCard` — exact position (above/below)
is a small layout call, not a new scoping question.

## Decision — 2026-08-04, Michael

1. ~~Placement~~ — **B2**, above Settings. "A good option to start."
2. ~~Free-plan visibility~~ — **show everyone**, confirmed explicitly.
3. ~~Sequencing~~ — **B2 first.** Home-page discovery card (C) explicitly
   deferred, not dropped: "if it gets usage we can add the home page
   discovery card later." Not built in the same pass as B2.
4. **Free accounts should land on a "Make a Verified Badge for a document"
   pitch, not a generic Console pitch — already built, checked against the
   actual code, nothing new needed.** Console's own empty state
   (`console-chat.tsx`, `messages.length === 0` block) already does exactly
   this, built 2026-08-02 alongside `CONSOLE_FREE_TIER_SCOPE.md`: it leads
   with the `hero-verified-badge.png` thumbnail, "Get a Verified Badge for
   proof — seal a finished file..." copy, and a "Get a Verified Badge for
   proof" attach button — and the generic "Console can also send,
   bulk-send..." line is already conditionally hidden for Free orgs
   (`{!isFreePlan && ...}`) since they can't reach send/bulk-send without
   templates (Pro+-only). A Free org reaching `/console/app` via the new B2
   entry lands directly on this, no additional build required — it's
   sitting behind the same "Console isn't deployed yet" wall as everything
   else in Console, not a separate gap. If this was instead meant as the
   spec for the *home-page* discovery card's Free-specific copy when C
   eventually gets built, this same "Verified Badge, not generic Console"
   framing is the natural, already-established choice to reuse there too —
   flag if that's what you meant and I'll fold it into C's eventual scope
   explicitly.

## Recommendation

**B2 (above Settings, in the account menu) + show everyone**, not A and not
C/D, for one reason that ties the two questions together: Console has zero
production track record right now — it isn't even deployed. A permanent
top-bar tab (A) is the highest-commitment, highest-visibility option
available, and spending it on something no real customer has used yet
repeats exactly the situation that got it hidden on 07-30 in the first
place, just with more built underneath it. A home-page promo card (C/D) has
the same problem one level down — it's an active push, not just
reachability, for a feature that hasn't proven itself live yet.

B2 solves the actual stated problem — right now there's *zero* in-app path,
full stop — without over-committing before there's any usage signal.
"Above Settings" still makes it genuinely discoverable (the honest goal
here, since nobody currently knows to look for it) rather than quietly
tucked next to Log out where it reads as an afterthought (B1). Once Console
is deployed and has a few weeks of real usage behind it, promoting it to the
already-built top-bar tab (A) is a one-line change at that point — this
isn't a dead end, just the right first step.

On gating: **show everyone**, because the old Pro+-only assumption is
already stale — Free has real sealing access in Console now, not just a
teaser. Match the existing Templates/Reminders convention: Free sees the
entry too, landing on whatever's actually available at their tier (sealing)
rather than a hard wall, Pro+ sees the full thing. Hiding it from Free would
be gating against a reality that's already shipped.

On sequencing: build this now — it's small and has no data-model cost
either way — but gate it behind the same kind of hardcoded flag pattern
`showConsole` already uses, left off until the Console deploy itself is
confirmed live and healthy. Don't let the nav entry go live ahead of the
product it points to.

## How to apply

Decisions locked above, B2 and C together. Still waiting on an explicit
build instruction before touching any of `dashboard-nav.tsx` /
`dashboard/layout.tsx` / `dashboard/page.tsx` — this doc records what to
build when that instruction comes, per this project's standing rule that
answering a scope doc's open questions isn't itself approval to build. When
built:

- **B2:** add a Console entry to the account dropdown (desktop) and mobile
  "More" sheet, positioned first (above Settings), visible to every plan
  tier, wired to `https://console.signedby.ai/app`, gated behind a new flag
  (mirroring `showConsole`'s existing pattern) left off until Console's own
  deploy is confirmed live.
- **C:** a new dismissible card component on `/dashboard`, alongside
  `ReferralCard`, `localStorage`-backed one-time dismiss (matching
  `ReferralCard`'s own pattern), explaining both Console and Verified Badge
  per the content shape above, linking through to
  `https://console.signedby.ai/app`.
- Both gated behind the same "don't go live before Console's own deploy is
  confirmed" flag as B2 — no reason to show either one pointing at a product
  that isn't live yet.
