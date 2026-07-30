# Scope: console.signedby.ai — a metered AI signing-ops product

Status: SCOPED, NOT BUILT. Waiting on explicit go-ahead.

Headline (as given): **"Use your favorite AI to send signing requests.
Signing infra made for Europe."**

## What this actually is, technically

Not a new API — the REST API + webhooks documented at `/developers` (shipped
this session) already does everything "send a signing request" needs.
`console.signedby.ai` is a **separate branded surface + billing model** on
top of the same endpoints: a dedicated subdomain (same playbook as
`dev.signedby.ai` — DNS + Vercel routing already solved once), positioned
and priced for a different buyer than the existing Business-tier "API
included" perk.

This matters for the pricing question below: today, full API access is a
**Business-plan-included, flat-fee** perk (no metering, $29/mo, unlimited
within the 60/hour rate limit). Console is explicitly *not* that — it's a
**lower-barrier, pay-for-what-you-use** path for Pro-tier customers who
don't want to jump all the way to Business/Team seats just to wire up
automation. The two coexist: Business customers keep unlimited included
API access; Pro customers get metered console access as a new upsell path
that didn't exist before.

## Gate: Pro tier minimum

You specified "at minimum the Pro tier" (renamed Starter) because that's
where template access lives (`FEATURE_PLANS.templates` already includes
`starter`/`team`/`business`, excludes `free`) — sending via API requires a
`template_id`, so this gate is really "must have templates," which the
existing feature-gate map already expresses correctly. No new gating
mechanism needed, just a new check: console access requires `templates`
feature flag true (Pro+), separate from the existing `apiAccess` flag
(Business-only, stays as-is for the included/unmetered path).

## What "for AI" means in the headline

"Use your favorite AI to send signing requests" is a genuine, current
positioning — not just marketing language for the same API docs. The
concrete version of this: expose the same endpoints as MCP tools (Claude,
and any other MCP-speaking agent) and/or an OpenAI-style function-calling
schema, so a user's AI assistant can call `POST /api/v1/documents` as a
named tool ("send this for signature") rather than the user writing curl by
hand. This is the actual product, not a copy-only rebrand of `/developers`.
Concretely this needs:
- An MCP server manifest wrapping the existing endpoints (thin — the
  underlying routes don't change)
- Per-key scoping so a console API key can be handed to an agent with
  appropriate limits (this is the metering surface, see below)
- The existing HMAC webhook signing already covers the "AI gets notified
  when it's signed" half of the loop

## Metering model — researched comparables

Competitor API pricing (2026, verified via search): DocuSign's metered API
is **$25 per envelope**; PandaDoc's API is usage-based with overage past
included credits, gated to Enterprise; SignWell (the cheapest real
comparable) runs free-3-docs → ~$10 Light → $30–36 Business, plus
pay-as-you-go API pricing. The market range for "usage-based e-signature
API" runs from well under $1/document (SignWell-tier) up to DocuSign's $25.
The emerging pattern for **AI-agent-specific** tool billing in 2026 is
per-call or hybrid subscription-plus-overage metering, run through Stripe
usage records rather than anything crypto-native (x402 exists but is not
a fit for SignedBy's buyer).

**Proposed structure**, consistent with the "flat-fee, not per-seat, honest
pricing" identity the vs-pages already sell against DocuSign specifically:
- No separate monthly console fee — access is included the moment an org
  is Pro+ and generates a console API key.
- Metered per **document sent** via the API (the same billable unit
  DocuSign meters), not per API call generally — reads (`GET`), status
  checks, and webhook deliveries stay free, matching how DocuSign only
  meters the envelope-send action.
- A small monthly free allowance (e.g., 20 sends/mo, matching the existing
  free-tier document-cap number already used elsewhere in the product) so
  someone can wire up and test an integration before paying anything
  incremental.
- Overage priced meaningfully under every competitor found in research —
  proposing **$0.25–$0.50 per document** sent beyond the free allowance as
  the range to land pricing in; this undercuts SignWell's pay-as-you-go
  tier (the cheapest real comparable found) while still being real margin
  given Mistral + R2 + Vercel are the only marginal costs per document.
- Implementation: Stripe metered billing (usage records reported per
  successful `POST /api/v1/documents` call), same primitive the market
  research surfaced as standard for 2026 API/agent billing — no new
  payment infrastructure needed beyond Stripe, which is already live.

**Exact price needs your call**, not mine — the range above is a
research-backed starting point, not a final number. Flagging explicitly:
this is the one number in this whole scope that should be a deliberate
pricing decision, not something I pick.

## What "signing infra made for Europe" adds to this specific product

This headline claim is stronger here than as a general homepage badge (see
`EU_TRUST_CERTIFICATIONS_SCOPE.md`) because the audience is specifically
developers/agents choosing infrastructure, where "EU-hosted, GDPR-native"
is a real technical decision criterion, not just trust-building copy. Two
real, already-true claims to lean on: EEA-based processing (already stated
on `/security`) and a Dutch legal entity (SPRK10 B.V.) — genuinely
differentiated versus DocuSign/PandaDoc/SignWell, all US companies. Note
the live EU AI Act high-risk-system deadline is **August 2, 2026** — three
days from today. Worth a quick gut-check (not a blocker) on whether any of
the AI-assisted features this console exposes (field-suggestion, AI
drafting) could be read as "automated decision-making" under the Act;
recommend a short legal read before the headline ships, not a full audit.

## Scope of the actual build (if greenlit)
1. `console.signedby.ai` subdomain (DNS + Vercel routing — same steps as
   `dev.signedby.ai`)
2. A minimal console dashboard: API key management (reusing what
   Settings → Integration & API already has) + usage/spend view
3. Stripe metered price + usage-record reporting on the document-send
   endpoint
4. New `consoleAccess` feature-gate check (Pro+, distinct from the existing
   Business-only `apiAccess` flag)
5. MCP manifest / function-calling schema wrapping the existing endpoints
6. Landing page at `console.signedby.ai` with the given headline, likely
   reusing `/developers`' structure and hero pattern rather than starting
   from scratch

## Open questions
- Confirm the free-allowance number and the $0.25–$0.50/doc overage range,
  or give me a different number to scope against.
- Confirm Business-tier customers keep unlimited included API access
  unchanged (i.e., console is additive, not a replacement).
- Decide if the MCP-manifest half of "use your favorite AI" ships in v1 or
  if v1 is console + metering with MCP as a fast-follow.
