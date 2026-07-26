# Email delivery visibility — scope (bounce tracking + pre-send check)

Status: **scoping, not built**. Covers two related asks: (A) let the sender see if
an invite email bounced, and (B) whether a pre-send validity check is realistic.

## A. Bounce/complaint visibility

### Why this doesn't exist today (recap)

No `/api/webhooks/resend` route exists (the only webhook route is
`/api/webhooks/stripe`), `sendSignerInviteEmail()`'s return value is discarded at
every one of its 5 call sites, and `signers.status` (migration 0001) has no
delivery-problem state — only `pending/sent/viewed/signed/declined`.

### What Resend actually reports, and when

Confirmed against Resend's current docs (resend.com/docs/webhooks/event-types):
the relevant events are `email.sent` (API accepted it), `email.delivered`,
`email.delivery_delayed` (temporary — full mailbox, transient server issue),
`email.bounced` (**permanent** rejection by the recipient's mail server),
`email.complained` (delivered, but marked as spam), `email.failed` (rejected
before it even left Resend — bad API key, domain issue, etc.), and
`email.suppressed` (Resend's own suppression list — an address with a recent
history of hard bounces gets silently skipped on future sends, which would
otherwise look identical to a successful send with zero indication anything is
wrong). All of these matter for "did the sender's invite actually arrive" —
not just the literal bounce event.

Payload shape (confirmed from Resend's docs), the piece that matters for us:

```json
{
  "type": "email.bounced",
  "data": {
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "to": ["signer@example.com"],
    "bounce": { "type": "Permanent", "subType": "Suppressed", "message": "..." }
  }
}
```

`data.email_id` is the same id Resend's `.emails.send()` call returns
(`{ data: { id }, error }`) at send time — that's the join key. Since that return
value is currently thrown away everywhere, capturing it is the first real change
needed, not the webhook route itself.

### Proposed schema change (new migration)

Add two columns to `signers` — deliberately **not** touching the existing
`status` enum, since that column drives real routing logic (sequential signing
order, who's "current") that a delivery problem is orthogonal to. A bounced
invite doesn't mean declined or completed, it means the signer never got it —
mixing that into `status` risks breaking every place that already switches on it.
Same reasoning as the `event_type` widening pattern used earlier for
`audit_events` (migration 0034) — additive, narrow, doesn't touch existing logic.

- `last_email_id text` — the Resend id from the most recent send to this signer.
- `last_email_event text check (... in ('sent','delivered','delayed','bounced','complained','suppressed'))`
- `last_email_event_at timestamptz`

Using "most recent send" rather than a full per-email history table is the
proportionate v1 scope — a signer only ever needs one answer ("is their current
invite link stuck"), not a timeline. An older reminder's bounce arriving out of
order after a newer send already succeeded would just fail to match any row and
silently no-op, which is an acceptable edge case here.

### Capturing the send-time id (touches 5 call sites)

`sendSignerInviteEmail()` (and friends) need to return `{ data, error }` instead
of discarding it, and each caller needs to persist `data?.id` onto the signer row
right after sending — and, just as importantly, actually check `error` for the
first time. Resend's SDK can return `{ error }` without throwing (e.g. a rejected
recipient), which today is silently swallowed everywhere except one route
(`signers/[signerId]`) that only catches a *thrown* exception, not this shape.
Call sites needing this: `documents/[id]/send`, `templates/[id]/bulk-send`,
`v1/documents`, `documents/[id]/signers/[signerId]` (corrected-recipient re-invite),
and the next-signer notification inside `sign/[token]/submit`.

### The webhook route

`/api/webhooks/resend/route.ts`, mirroring the existing
`/api/webhooks/stripe/route.ts` pattern exactly — same shape, same reasoning
(unauthenticated, verified by signature instead, service-role admin client):

- Read the raw text body (`request.text()`) — Resend's own verify tip warns that
  parsing-then-restringifying breaks signature verification, the same class of
  gotcha as other body-shape issues hit earlier in this project.
- Verify via `resend.webhooks.verify({ payload, headers: {id, timestamp,
  signature}, webhookSecret: process.env.RESEND_WEBHOOK_SECRET })` (Resend's SDK
  wraps Svix verification directly — no separate `svix` package needed).
- On `email.bounced` / `email.complained` / `email.delivered` /
  `email.delivery_delayed` / `email.suppressed`: `update signers set
  last_email_event = ..., last_email_event_at = now() where last_email_id =
  data.email_id`.

### One manual step only Michael can do

Registering the webhook endpoint itself (URL + which events + generating the
signing secret) happens in the Resend dashboard, not in code — that's an account
setting, so it's on you to create it and drop `RESEND_WEBHOOK_SECRET` into Vercel
once the route exists. I'll give exact values to enter when this is built.

### Does the sender get an email about the bounce, or only a dashboard badge?

As scoped above, **only a dashboard badge** — nothing proactively tells the
sender a bounce happened. Worth calling out because it's a real gap on its own:
documents already have a sender-settable expiration date with a daily reminders
cron (migration 0030) running silently in the background, so a bounced invite
could otherwise just sit there until the document quietly expires, with the
sender never having a reason to go check the dashboard in between.

Recommend adding a `sendBounceNotificationEmail`, the same "let the sender know
something happened without them" shape already used twice —
`sendDeclineNotificationEmail` and `sendDocumentExpiredEmail` (both: fetch the
doc owner's email, name the signer, link to `/dashboard/documents/[id]`). Fire
it from the webhook handler, not from the send path, so it reflects the real
outcome rather than a guess.

Scope it to `bounced` and `suppressed` only, not `complained` — a bounce or a
suppressed address means the invite never arrived at all, which is directly
actionable (fix the address, resend). A spam complaint means it *did* arrive;
there's nothing for the sender to fix, so an email there would just be noise —
the dashboard badge is enough for that case.

### Two small follow-ons worth bundling in

- Dashboard: wherever signer status is already shown to the sender, add a
  "bounced" indicator when `last_email_event` is `bounced`/`complained`/
  `suppressed` — exact component TBD when this gets built, haven't located it
  precisely yet.
- Reminders cron (the daily expiration-reminder job): skip a signer whose
  `last_email_event` is `bounced`/`suppressed` — sending reminders into a
  confirmed-dead address helps nobody and just adds more bounce history against
  the sending domain's reputation.

## B. Pre-send validity check

Three tiers, in order of how realistic each one is:

**1. MX record lookup — recommend this now, bundled with the above.** A plain
DNS query (`dns.promises.resolveMx(domain)`) confirms the domain has mail servers
at all — catches a typo'd or non-existent domain (`gmial.com`, `acme.con`)
before ever calling Resend. Free, no new vendor, no per-lookup cost, runs
server-side in the same routes as the send call. Not bulletproof — a domain
having MX records says nothing about whether the *specific mailbox* exists — but
it catches a real, common class of typo that today sends straight into a
guaranteed bounce. A DNS timeout or transient resolution failure should fail
open (allow the send) rather than block a legitimate address over a blip.

**2. Real-time SMTP mailbox verification (RCPT TO probing) — not recommending
this at all, any phase.** This is the "does the actual mailbox exist" check, but
building it in-house isn't practical: most serverless hosts restrict raw
outbound SMTP (port 25) specifically to prevent spam abuse (I'd want to confirm
Vercel's exact current policy before ruling it out completely, but this is an
industry-wide default), and even where it's technically reachable, large
providers (Gmail, Outlook, Yahoo) routinely accept-all at the RCPT stage or
block/rate-limit the probe outright to prevent directory-harvesting attacks —
so the check would silently lie "valid" for a nonexistent Gmail mailbox as often
as not. This is exactly why real-time verification is normally bought from a
specialized vendor with its own IP reputation, not built from scratch.

**3. Third-party validation API — phase 2, explicit vendor decision, not
bundled now.** Confirmed Resend doesn't offer this itself (their own blog
recommends other providers for it), so this means a genuinely new sub-processor
plus a per-lookup fee — which triggers the same legal-pages update you've done
for prior new vendors, and isn't free the way the MX check is. Worth revisiting
once bounce-volume data from part A shows whether typo'd/dead addresses are
actually a frequent enough problem to justify paying for it.

## Decisions (2026-07-26)

1. **MX-check failure** — warning only, not a hard block. A dismissible inline
   warning ("This email domain doesn't appear to accept mail — check for a
   typo") lets the sender proceed anyway, so an unusual-but-real small-business
   mail setup can't get falsely blocked from sending.
2. **Sender bounce email** — yes, add `sendBounceNotificationEmail` per the
   section above, scoped to `bounced`/`suppressed` only.

## Open questions

1. Any objection to the two-column addition (`last_email_id`,
   `last_email_event`) on `signers`, or would you rather see the exact migration
   SQL before I write it?
