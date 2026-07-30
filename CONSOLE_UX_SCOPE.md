# Scope: an actual interactive console (chat + bulk send + BYOK + meter/cap)

Status: SCOPED + MOCKED UP, NOT BUILT. Waiting on go-ahead.

Supersedes this doc's earlier "extend the Settings card" proposal (kept as
history below) — the console is now scoped as a real interactive surface,
not a settings card with a progress bar. Follows CONSOLE_AI_SIGNING_SCOPE.md
(the pitch page, pricing, and metering backend — all shipped) and the
marketing-link removal (2026-07-30, commit 5eacd6f).

## What changed, and why this needs a dedicated page now

Michael's direction: a subscriber already has every other SignedBy feature
on the root site — what they want *at* console is to actually operate the
platform conversationally: bulk-upload a signer list, talk to a Mistral
chat interface that can act on their account, or connect their own AI
using a third-party key. That's a real product surface (chat, tool calls,
live usage/billing state), not a card in Settings. This doc proposes a new
`/dashboard/console` page.

The Settings-card API-key-access gap from the first pass of this doc still
needs fixing regardless (see "Still true from before" below) — the console
chat authenticates as the org, same as an API key would, so the same
`apiAccess || consoleAccess` gate applies.

## 1. Bulk signer upload — expose what already exists

`bulk-send-button.tsx` / `/api/templates/[id]/bulk-send` already does
this (upload a recipient list, send one template to each person, auto-sent
immediately), gated to `bulkSend` (Team+ today — no new gating decision,
console just needs to respect the same flag). The only real gap: that
route is session-cookie-authenticated, not API-key-authenticated, so
neither an external agent nor the new in-console chat can call it yet.
Needs: an API-key-authenticated equivalent (same underlying logic), which
becomes one of the console chat's callable tools and a documented
`/api/v1` endpoint external agents can use too.

## 2. Mistral chat interface — the actual console

A chat pane on `/dashboard/console`, function-calling against a narrow,
explicit tool set — not a general-purpose assistant with account access.
Proposed v1 tools, all mapping 1:1 to existing `/api/v1` actions plus the
new bulk-send endpoint above:
- `send_document` (template + signer(s))
- `bulk_send` (template + recipient list/CSV)
- `check_status` / `list_documents`
- `void_document`

Guardrails:
- Any action that sends real email to real people (`send_document`,
  `bulk_send`) requires an explicit confirm step in the chat before
  executing — the chat proposes the action ("send NDA to these 12
  people?"), the user confirms, then it runs. No silent sends.
- Tool set is fixed and narrow: nothing that touches billing, plan,
  team/seats, or account settings is reachable from chat, regardless of
  what the model is asked to do.
- Same rate limits as the API-key path (60/hr) apply to chat-driven calls.
- Every chat-triggered send/void is attributed and logged the same way an
  API-key call would be (audit trail, not a special "chat did this"
  exemption).

Model: Mistral by default (already the org's provider, already paid for,
consistent with `AI provider selection` — no new vendor relationship).

## 3. Bring-your-own-key (BYOK)

An org can supply their own OpenAI/Anthropic/Mistral key to power *their*
console chat specifically, instead of SignedBy's Mistral account. Two
reasons to build this, not just one: model choice for power users, and
margin protection — the business-case model already flagged unmetered
heavy API usage as the real margin risk at scale (Business's stress case
fell to ~65% margin at 1,000 docs/mo); a heavy chat user on SignedBy's own
Mistral key has the same shape of risk, and BYOK moves that inference
cost onto the customer who's generating it.

Scope boundary: BYOK affects only the console chat's model calls. The
existing AI features elsewhere in the product (field-suggestion,
AI-drafting, summarization) keep using SignedBy's own configured provider
— this isn't an org-wide "bring your own AI everywhere" change, just a
console-chat-specific one, since that's the feature whose usage cost
scales with a customer's own volume.

Recommend as fast-follow, not v1 — ship the chat on SignedBy's own Mistral
key first, add BYOK once real usage data shows it's needed.

## 4. Meter + running bill + spend cap

The console page shows, at all times:
- **Units this period**: e.g. "34 sends · 20 free + 14 billable"
- **Bill so far**: computed from the local counter × the org's per-doc
  rate (`console_usage_current_period`, already tracked in
  `console-usage.ts`) — **not** pulled live from Stripe. Stripe's Billing
  Meters aggregate asynchronously (its own docs note upcoming invoices
  "might not immediately reflect recently received meter events"), so the
  local counter is already the only real-time-accurate source and stays
  the one the UI reads from, same as Stripe reporting does today.

**Spend cap** (new): a dollar amount the org sets, plus an on/off toggle.
When enabled and the period's bill reaches the cap, further metered sends
(chat, API key, or bulk) are rejected with a clear error until either the
period rolls over or the org raises/disables the cap. This never affects
Business (unmetered, no cap concept) or non-console document creation in
the regular dashboard — it only gates the metered console path.

Needs, schema-wise: `console_spend_cap_cents` (nullable) and
`console_spend_cap_enabled` (boolean, default false) on `organizations`,
checked in the same place `recordConsoleUsage`/`authenticateApiRequest`
already run.

**Found while scoping this**: there is currently no reset logic for
`console_usage_current_period` at all — it only ever increments. That's a
pre-existing gap this work needs to fix regardless of the cap (a cap is
meaningless against a counter that never resets). Proposed fix: extend the
existing `invoice.payment_succeeded` handler in
`src/app/api/webhooks/stripe/route.ts` (already wired, currently used for
referral rewards) to zero the counter at each new billing period, rather
than adding a new Stripe event subscription.

## Mockup

Shown above/below in chat: the console page with the chat pane on the
left and the usage/cap panel on the right.

## Decided (2026-07-30)
- **80% warning, confirmed.** Before the hard stop, an in-app banner on
  `/dashboard/console` plus an email (reusing the existing
  `sendPlanUpgradeEmail`-style transactional pattern, not a new provider)
  fire once the period's bill crosses 80% of the cap, so the org has a
  chance to raise it or turn metering off before sends actually pause.
  This needs one more piece of state — a `console_cap_warning_sent_at`
  (or similar, reset alongside the usage counter each period) so the
  warning fires once per period, not on every request past 80%.
- **BYOK confirmed as phase 2 fast-follow**, not v1. V1 ships chat +
  bulk-send + meter/cap on SignedBy's own Mistral key only.

- **Cap default: on, at $25/month**, confirmed. Every Pro/Team org starts
  capped rather than opting in later. First time the org opens
  `/dashboard/console` (or the cap control specifically), a floating
  popover explains what the cap is, that it's pre-set to $25, and that
  they can raise it, lower it, or turn it off — dismissible, shown once
  (needs a `console_cap_intro_seen_at`-style flag, same pattern as the
  per-period warning flag above, but permanent rather than reset each
  period).

## Open questions
- Confirm v1 tool set (send/bulk-send/status/void) is the right scope —
  anything else that should or shouldn't be chat-reachable?

## Pricing correction (2026-07-30, after build)

Original scope (both this doc and CONSOLE_AI_SIGNING_SCOPE.md) had
Business getting unlimited, unmetered console access, mirroring its
existing `apiAccess` perk on the plain API. Direct instruction after
testing: **console is metered for every plan, Business included** — it's
a distinct signing-ops product layered on top of a standard subscription,
not something a Business upgrade should make free. "Pro plan or higher"
is only the access gate now, not a metering exemption.

Scoped narrowly to the console surfaces (chat, `/api/console/chat`, and
the new `/api/v1/documents/bulk-send` endpoint) — the pre-existing plain
`/api/v1/documents` API (Business's older, separately-marketed "API
access included" perk) is untouched and stays unmetered for Business,
since that predates console and wasn't part of this instruction. Flagged
to Michael as a judgment call worth confirming explicitly.

## Status: scope complete

All open questions from this doc are now decided. Ready to build whenever
you give the go-ahead — nothing further to scope unless the remaining
tool-set question above needs a different answer.

---

## Superseded: original Settings-card-only proposal (kept for history)

Still true and still needed regardless of the above: today, a Pro or Team
org has no way to get an API key at all (`src/app/dashboard/settings/page.tsx`'s
"Integration & API" card only renders key-management UI when `hasApiAccess`,
Business-only; `/api/org/api-key` enforces the same server-side). Fix:
change that gate to `apiAccess || consoleAccess`. This was originally
proposed as the whole console UX (a badged, metered version of the same
Settings card); it's now just the prerequisite that lets a Pro+ org
authenticate at all, with the actual console experience being the
dedicated chat page above.
