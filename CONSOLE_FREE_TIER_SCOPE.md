# Scope: Console free "teaser" tier — API/MCP access for Free-plan orgs

**Amended 2026-08-10 (direct instruction):** the console.signedby.ai *web
app's* entry points ("/" and "/app") now redirect Free-plan orgs (and
unauthenticated visitors) to signedby.ai instead — see src/middleware.ts's
`resolveConsoleGatePlan`/`CONSOLE_GATE_PLANS`. Reasoning: two visually
different interfaces (dashboard vs. console's chat UI) were a support/
confusion cost for people who hadn't paid for anything yet; Starter/Team/
Business have at least shown enough commitment to count as "experienced."
This narrows, but does NOT undo, item #1 below — Free's `consoleAccess`
feature-plan entry, checkFreePlanSealCap, and the API sandbox are all
still exactly as shipped 2026-08-02. A Free org's REST API key still works
(that API is at signedby.ai/api/v1, never routed through this host), and
console's own tools still treat Free as having `consoleAccess` — there's
just no way to reach the console.signedby.ai UI itself as a Free org
anymore. If this host-gate is ever removed, the rest of this doc's
"shipped" state is still accurate and needs no further changes.

Status: PARTIALLY BUILT. Shipped 2026-08-02 (commit `366e86a`): item #1
(Free-tier console access, narrowed in practice to Verified Badge sealing —
see below) and the "Upgrade to Pro" half of #1a's cap-reached bubble.
Shipped 2026-08-03 (commit `285d8c9`): cap-hit tracking + daily digest
visibility (not originally in this doc's item list — see
plan-cap-hits-tracking memory). Shipped 2026-08-03 (commit `7309deb`): item
#8, the credit-pack top-up flow — $5/25 seals (price dropped from the
original $10 same day), cap-hit moment only (console chat bubble +
dashboard error line, no standalone billing-page entry point). Shipped
2026-08-03 (commit `5ce4a37`): the disposable-email-blocking piece of #4's
bot/abuse mitigation. Still explicitly NOT built: the tool-call cap (#2),
Pro+ hard document pools (#3), the rest of #4 (GitHub/LinkedIn OAuth
enforcement, free-tier-specific rate-limit tightening), badge branding by
plan (#5), white-label verify pages (#6), and audit export (#7). Also not
built: the return-to-
same-conversation-after-checkout refinement from #1a (cross-subdomain
redirect safety between signedby.ai and console.signedby.ai needs its own
pass) — both the Pro checkout and the new credit-pack checkout still land on
the generic /dashboard/billing regardless of where the person started.

**Real constraint found mid-build, resolved by direct decision**: Console's
send_document/bulk_send tools require an existing template, and creating one
(`save-as-template`) was already Pro+-gated (`templates` feature) — so
opening `consoleAccess` to Free alone would NOT have made "send 3 documents/
month via console" actually reachable; a brand-new Free org would hit
"Templates are a Pro plan feature" on their very first send attempt. Decided:
leave `templates` Pro+-only, so Free's real console value for now is
Verified Badge sealing only (no template needed) — "upgrade to send with
templates" becomes the natural, honest upsell moment rather than the generic
3-doc cap. This also meant `checkFreePlanDocCap` needed no new call sites at
all: Verified Badge's upload already runs through the same presign/finalize
routes (`/api/documents/upload-url`, `/api/documents`) every other document
creation path uses, and those already enforce the cap.

Everything below this point is the original scoping pass — still accurate
for what's NOT yet built. Several pieces here are independent and could ship
on different timelines — this doc breaks them apart on purpose rather than
treating it as one feature, because their costs are wildly different (some
are a config-array edit, one is a genuine multi-tenant infra project).

## Read this first: a decision made yesterday points the other way

`API_TIER_SCOPE.md` (built 2026-08-02, one day before this request, not yet
deployed) made two decisions that this request directly reopens:

1. **Free tier gets zero Console/API/MCP access today, on purpose.**
   `consoleAccess` in `plan.ts` is `["starter", "team", "business"]` — Free
   is deliberately excluded. Console access has been Pro+-only since it was
   built.
2. **Volume is bounded by metered overage billing, not hard monthly pools.**
   Pro/Team/Business all get *unlimited* document sends through
   Console/API, gated only by `CONSOLE_FREE_ALLOWANCE` (50 free/mo, then
   $0.25/document) — explicitly chosen over a hard cap because "Console's
   bulk-send has no volume cap of its own... metering is the only thing
   standing between a Pro-tier org and an unbounded bulk send today."
   **Business is the only genuinely unlimited/unmetered tier.**

This request asks for the opposite shape on both counts: Free-tier access
(new), and hard per-tier pools (50/100/200 docs for Pro/Team/Business)
instead of unlimited-but-metered. Neither is wrong — but they're a real
reversal of a decision made yesterday, not an incremental extension of it,
and building both models side by side (metered overage AND hard pools)
would be confusing to maintain. Worth deciding explicitly which shape wins
before writing code. My recommendation is below, but this is a real
pricing-strategy call, not something I should quietly pick for you.

## What's requested vs. what exists today

| Area | Requested | Exists today |
|---|---|---|
| Free doc cap | 3 documents/mo, extended to Console/MCP/API | 3 documents/mo already exists (`checkFreePlanDocCap`), but Free is walled off from Console/API entirely — the cap has never applied there because access doesn't exist |
| Free MCP/API | Included, capped at ~10 tool calls/mo | No Free access at all; and no "tool call" counter exists anywhere — only "document sent" is metered |
| Pro/Team/Business doc cap | Hard pools: 50 / 100 / 200 per month | Unlimited, metered overage after 50 free/mo (all three tiers, same allowance) — no per-tier pool differentiation exists |
| Pro/Team/Business MCP/API | "Full production API & unlimited MCP" | Pro/Team: unlimited but metered (same $0.25/doc overage). Business: genuinely unlimited/unmetered. Webhooks: Business-only today (Pro/Team webhooks are a queued, undeployed change from yesterday) |
| Free verify page | Standard SignedBy.ai hosted page | This is just... what exists today, for everyone. `/verify` is one shared, unauthenticated page — no per-org variant exists at all yet |
| Pro+ verify page | White-label / custom domain | Does not exist. Zero multi-tenant or custom-domain capability anywhere in the codebase today |
| Free badge branding | "Verified via SignedBy.ai Free" | Badge text is 100% hardcoded identically for every org and plan (`badge-asset.tsx`) — no plan-conditional branching exists anywhere in that file |
| Pro+ badge branding | "Clean, premium branded badge" | Same as above — today's badge *is* already clean/plain (no "Free" watermark), so this really means "keep today's badge, add a downgraded one for Free," not a new premium design |
| Free audit log | Basic timestamp & hash | Already true today for everyone — `audit_events` captures event type, timestamp, IP, user agent, and a document hash per event |
| Pro+ audit log | "Full eIDAS-aligned audit trail + export" | The audit trail itself already exists and is reasonably rich (10 event types incl. viewed/consent/payment-link-clicked/docgate-clicked). Two real gaps: no export feature exists at all (CSV/PDF/download — nothing), and "eIDAS-aligned" is not a real certification anywhere in this codebase — see the eIDAS section below before using that phrase in pricing copy |

## Item by item

### 1. Free-tier Console/MCP/API access, 3 docs/mo

Cheapest version: add `"free"` to `consoleAccess` in `plan.ts`, and let the
already-existing `checkFreePlanDocCap` (3/mo, already route-agnostic — it
doesn't care whether a document came from the dashboard, API, or Console
chat) do the gating. This is genuinely a small change — the doc-cap
enforcement already exists and already doesn't discriminate by entry point,
same reasoning `API_TIER_SCOPE.md` used to justify Free's "sandbox via the
existing cap" a day ago. **Effort: small.**

Real product question underneath the small effort: `/console/app`'s own
layout and `/api/console/chat` currently hard-block anything below Pro with
language like "console genuinely doesn't work below Pro." That messaging,
the marketing copy on `/console` and `/developers`, and the pricing cards
all currently assert Pro-or-nothing — all of that needs a rewrite, which is
the same "hardcoded prose echoed in many places" tax `API_TIER_SCOPE.md`
hit when it only changed a number.

### 1a. The cap-hit moment itself — today's four inconsistent treatments

Direct follow-up question: "once the user hits 3 documents, do they get
kicked to the signup-for-Pro landing?" Grounded the actual answer instead
of assuming — today there isn't one consistent behavior, there are four,
and none of them reconnect someone to where they were after they upgrade:

- **Dashboard** (`new-document-client.tsx`): the only surface with a real
  machine-readable signal — the API returns `{ error, upgrade: true }`,
  and the client renders a small red inline error line with a **"View
  plans"** link to `/pricing` appended. Not a modal, not a redirect — the
  person stays on the same page and has to click through themselves.
- **Console chat, cap reached mid-conversation**: gets buried as a plain
  assistant sentence — *"Couldn't do that: Console spend cap reached
  ($X.XX this period)..."* — no button, no link, just text in the thread
  like any other reply.
- **Console chat, no access at all**: never actually reached in practice —
  `ConsoleWorkspace` swaps in `ConsoleLockedChat` before the chat ever
  mounts, so the person sees a dedicated "Upgrade to Pro to start chatting
  with console" screen with a real **"View plans"** button — but it points
  at a hardcoded `https://signedby.ai/pricing`, not something that returns
  them to Console after they subscribe.
- **REST API / MCP**: no landing page at all, by nature — these are
  programmatic callers. The REST API's doc-cap 402 at least carries the
  same `upgrade: true` boolean the dashboard uses; MCP's below-Pro error
  only works because someone happened to write "— see console.signedby.ai"
  into the message string, and MCP's own cap-hit tool errors (doc cap,
  spend cap) don't even do that — just the raw reason text, no pointer at
  all. An AI agent hitting this can't "get kicked" anywhere; the best it
  can do is relay a plain string to whoever's operating it.

**The concrete gap underneath all four**: even where a real upgrade link
exists, nothing carries someone back to where they were once they've
actually paid. Stripe Checkout's `success_url` is hardcoded in
`app/api/billing/checkout/route.ts` to `/dashboard/billing?success=1`,
full stop — unrelated to whatever feature sent them to checkout in the
first place. The `?intent=signup&next=...` pattern used elsewhere in the
app only survives the *sign-in* step, not an actual purchase.

**Recommended shape, reusing what already exists rather than inventing
new mechanics:**

1. Give the cap-hit moment in Console chat its own rich bubble type — the
   `Bubble` union already has special-purpose variants for other console
   moments (`certificateModeChoice`, `sealed`); a `capReached: { upgradeUrl }`
   variant fits the same pattern, rendered as a real button instead of a
   sentence fragment buried in `AssistantContent`.
2. Point that button (and every other upgrade link, across all four
   surfaces) at `/login?intent=signup&next=/console/app?c=<conversationId>`
   — reusing the exact conversation-resume-by-id mechanism already built
   this session for "browse a template, come back to the same chat." A
   free-tier person who hits their cap mid-conversation, signs up, and
   subscribes lands right back in that same thread, not a blank dashboard.
3. That only works end-to-end once Stripe Checkout's `success_url` stops
   being hardcoded — needs to accept and honor a return path (session
   metadata or a query param threaded through `/api/billing/checkout`),
   redirecting to wherever the person actually came from instead of always
   `/dashboard/billing`. This is the one piece of new plumbing; everything
   else above is rearranging what already exists.
4. Standardize the REST API and MCP error shape too: every 402 gets a real
   `upgradeUrl` string field (not just a boolean, not just a mention buried
   in a sentence), so a human reading raw JSON — or an agent relaying the
   error to whoever's operating it — always has one consistent, literal
   link to act on rather than four different shapes depending on which
   surface they hit the cap through.

**Effort: small.** Nothing here is new infrastructure — it's consistency
work across four call sites that already each do *part* of this correctly,
plus one real gap (checkout's hardcoded success URL) that's a contained,
well-understood fix.

### 2. Tool-call cap (~10/mo) — a genuinely new metering dimension

This is not the same thing as the existing document-send metering, and it's
worth being precise about why. `CONSOLE_FREE_ALLOWANCE` counts
`console_document_sent` events — sends only. The MCP server exposes seven
tools today (send, bulk-send-adjacent actions, status checks, void, list/
find template, etc.) — most of which never send anything and so are
invisible to the current counter. A "10 tool calls/month" cap needs a new
counter incrementing on *every* MCP tool invocation regardless of type, not
a lower version of the existing one. **Effort: small-to-medium** — the
rate-limiter and Postgres-counter patterns both already exist
(`rate-limit.ts`, the `console_usage_current_period` column pattern), so
this is "build a second counter next to the first one using the same
plumbing," not new infrastructure.

Open question: does a blocked-agent's list/status/read-only call also count
against the cap, or only send-adjacent ones? A coding agent doing normal
"check status before deciding what to do next" behavior could burn through
10 read-only calls before ever sending anything, which would make the free
tier feel broken rather than generous. Worth deciding the counted-action set
deliberately, not defaulting to "everything."

### 3. Pro+ hard document pools (50 / 100 / 200) vs. today's unlimited-metered model

Flagged at the top of this doc — restating the concrete cost here. Building
three new hard caps means: three new constants (replacing the single
`CONSOLE_FREE_ALLOWANCE`), new UI copy in the same half-dozen places
`API_TIER_SCOPE.md` already had to touch for one number, and a decision
about what happens at the cap — does Team hitting 100 docs get blocked
outright (a real product regression from today's "never blocked, just
billed"), or does overage billing still apply *above* the pool (in which
case the "pool" is really just a differently-shaped version of today's free
allowance, and the simplest implementation is: keep one mechanism, give each
tier its own allowance number instead of sharing one). **If the goal is
tier differentiation, the cheap version of this is real:** give Pro/Team/
Business their own `CONSOLE_FREE_ALLOWANCE`-equivalent (e.g. 50/100/200
free, then metered overage same as today) rather than a hard wall. That's a
small change reusing 100% of existing plumbing. A genuinely hard cap (no
overage, blocked at the limit) is the bigger, more disruptive version and
removes the "no volume cap of its own" safety valve `API_TIER_SCOPE.md`
specifically built metering to provide.

### 4. Bot & abuse mitigation

**OAuth enforcement (GitHub/LinkedIn/verified work email):** Real gap.
Today's login page has Google and Microsoft OAuth plus email/password and
magic-link — no GitHub, no LinkedIn. Adding either is a standard Supabase
Auth provider addition (OAuth app registration + a button + a callback
handler, same shape as the existing Google/Microsoft wiring) — **effort:
small per provider**, GitHub simpler than LinkedIn (LinkedIn's OAuth app
review process is slower and their API surface is narrower/more locked-down
than GitHub's). "Verified work email" needs its own definition — MX-record
validation already exists (`validate-email-domain.ts`) but that only checks
a domain *can* receive mail, not that it's a real company domain rather
than a personal one; there's no "is this a corporate vs. consumer email
domain" classifier anywhere today, so this would need either a paid
API/dataset or a maintained free-vs-work-domain list, which brings us to:

**Disposable email blocking:** Doesn't exist at all today — confirmed zero
references anywhere in the codebase. Cheapest real fix: a maintained
open-source disposable-domain blocklist package (several exist, free,
npm-installable, periodically updated) checked at signup for the free
Console/API path specifically. **Effort: small.** A paid deliverability API
(ZeroBounce, Kickbox, etc.) is more accurate and also catches things a
static list misses (recently-spun-up throwaway domains), at a small
recurring per-check cost — worth it only once free-tier abuse is actually
observed, not before.

**Sandbox rate limits on free MCP tool calls:** Mostly already built. A
real, working rate limiter exists (`rate-limit.ts`, Postgres-backed,
already wired into both the console chat route and the MCP route) — this
isn't a gap, it's a "add a stricter, free-tier-specific limit" tweak on top
of infrastructure that's already there and already proven (used in 29
files). **Effort: small.**

### 5. Badge branding by plan ("Verified via SignedBy.ai Free" vs. clean)

`generateVerifiedBadgeImage` in `badge-asset.tsx` is one function producing
one identical layout for every org today — no plan branching exists.
Adding a plan-conditional text line (or footer watermark) is a contained,
mechanical change to a file I already have fresh context on from this
session's spacing fix — same component, just an `if (plan === "free")`
branch on the text content. **Effort: small.** One nuance: today's badge
already reads as "clean" (no free-tier watermark) — so this item is really
"add a downgraded Free badge," not "build a new premium one," which is
good, since it's the cheaper direction.

### 6. White-label / custom-domain verify pages — the expensive one

Flagging this clearly: **this is the single most expensive item in the
entire request, likely bigger than everything else here combined.** Nothing
resembling multi-tenant routing or custom domains exists anywhere in the
codebase today — `/verify` is one shared page. A real custom-domain verify
page means: per-org domain configuration, DNS verification (a customer
proving they control `verify.theircompany.com`), automated SSL certificate
provisioning per domain (Vercel supports this but it's real setup, not a
toggle), and routing logic that resolves an incoming custom domain back to
the right org and applies their branding. This is a genuine infrastructure
project, not a feature flag. **Effort: large — likely worth its own
dedicated scope doc if you want to pursue it, rather than folding it into
this one.** A meaningfully cheaper partial version exists if the goal is
just "looks less generic": a subdomain-per-org on SignedBy's own domain
(`acme.verify.signedby.ai` via wildcard DNS, no customer-owned domain, no
per-domain cert work) gets most of the perceived value at a fraction of the
cost — worth considering as the actual Pro+ deliverable instead of true
custom domains, at least for a first version.

### 7. "eIDAS-aligned audit trail + export"

Two different things bundled in one phrase — worth separating before it
becomes pricing-page copy:

- **Export**: doesn't exist at all today (the audit trail only renders
  inline, no CSV/PDF/download anywhere). Real, buildable, contained.
  **Effort: small-to-medium** — the data's already there
  (`audit_events`), this is a formatting-and-download-endpoint job.
- **"eIDAS-aligned"**: `EU_TRUST_CERTIFICATIONS_SCOPE.md` already dug into
  this exact territory a day earlier and its finding still applies —
  "eIDAS" today lives only as legal-copy framing on `/privacy` and
  `/security` (dual controller/processor language, EEA data residency),
  not any certification or audited trust-service status. Actually
  *becoming* an eIDAS-recognized trust service, or even integrating with a
  Qualified Trust Service Provider to make a real "eIDAS Qualified
  Electronic Signature available" claim, is a months-long, meaningfully
  expensive undertaking — that scope doc rejected it as premature for now.
  **Recommendation: ship the export feature, and describe it honestly**
  ("structured, exportable audit trail" / "timestamp, hash, and identity
  evidence formatted for compliance recordkeeping") **rather than the
  phrase "eIDAS-aligned,"** which implies a conformance claim this product
  doesn't have and isn't close to having. Cheap to get right, easy to get
  wrong in a way that's a real legal-copy liability, not just marketing
  puffery — signature/audit compliance claims are exactly the kind of thing
  that gets scrutinized.

### 8. Pay-as-you-go / prepaid credits (e.g. $10 for 25 seals)

Real, clean, separable idea — genuinely worth doing on its own timeline
regardless of what happens with the free tier above. Today's billing is
Stripe subscription-mode only; zero one-time-payment flows exist anywhere
(`mode: "payment"` appears nowhere in the codebase). Building this means: a
new Stripe Checkout flow in one-time-payment mode, a credits-balance ledger
(new table — balance, top-ups, debits), and wiring the existing send-gating
checks (same call site as `checkConsoleCap`/`checkFreePlanDocCap` today) to
also accept "spend down a credit" as a valid path alongside "under your
monthly allowance." **Effort: medium** — it's a real new payment flow, but
every piece it touches (Stripe integration, usage-gating call sites) is
existing, understood code, not new territory the way custom domains would
be. The India/recurring-card-friction reasoning is sound and matches a
well-known pattern (prepaid > subscription in markets with lower card
penetration or card-decline rates) — this is worth greenlighting
independently of the rest of this doc if you want a quick win.

## Recommended phasing (cheapest path to something real)

**Phase 1 — small, reuses existing plumbing entirely:**
Free-tier Console/API access on the existing 3-doc cap (#1) · a consistent
cap-hit-to-checkout-and-back flow (#1a) · badge branding by plan (#5) ·
disposable-email blocklist (#4) · free-tier-specific rate limit tightening
(#4, the limiter already exists) · GitHub OAuth specifically (simpler
review process than LinkedIn).

**Phase 2 — medium, new-but-familiar territory:**
Tool-call counter as a second metering dimension (#2) · audit trail export,
honestly labeled (#7) · pay-as-you-go credit packs (#8) · LinkedIn OAuth ·
Pro/Team/Business getting their *own* free-allowance numbers instead of one
shared 50 (the cheap version of #3, not the hard-cap version).

**Phase 3 — large, deserves its own scope doc, don't fold into a first
release:**
True white-label custom-domain verify pages (#6) — or descope to the
subdomain-based cheaper version above and skip this phase entirely for now.
A hard hard-wall document cap for Pro+ (the expensive version of #3), if
still wanted after seeing Phase 1/2 usage data.

## Open questions — real decisions, not defaults I should pick

1. **Free-tier Console/API access at all, reversing yesterday's
   Pro-only decision** — confirm this is genuinely wanted, not just the
   document cap number.
2. **Hard pools vs. today's unlimited-but-metered model** for Pro/Team/
   Business — my recommendation is keep metering (cheap, proven, already
   deployed-pending), give each tier its own allowance number instead of a
   hard wall. Confirm or override.
3. **What counts against the 10-tool-call cap** — every MCP call, or only
   send-adjacent ones? Affects whether the free tier feels workable for a
   coding agent doing normal status-checking behavior.
4. **"Work email" definition** — MX-valid isn't the same as "corporate, not
   personal." Decide whether a disposable-blocklist alone is good enough at
   launch, or whether a paid work-email classifier is worth it from day one.
5. **Custom domain vs. subdomain** for the Pro+ verify page — the true
   custom-domain version is the expensive one; confirm whether the
   subdomain-based cheaper version is an acceptable substitute, at least
   for v1.
6. **eIDAS wording** — confirm the "structured/exportable" framing instead
   of "eIDAS-aligned" for pricing copy, given the certification gap
   documented in `EU_TRUST_CERTIFICATIONS_SCOPE.md`.
