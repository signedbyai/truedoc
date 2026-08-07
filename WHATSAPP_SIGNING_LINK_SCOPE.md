# WhatsApp signing-link delivery — scope

Scope only, not built (2026-08-07, direct ask: "how hard would it be to
send the signing link to a user's WhatsApp"). Grounded in the actual
current code, not assumption — see "Current state."

## Why this now

No trigger beyond the direct question — no WhatsApp/SMS infrastructure
exists anywhere in the codebase today. Worth scoping because the honest
answer isn't "easy" or "hard," it's "the code is the small part — the
real gate is an external account-approval process this project has no
control over the timeline of."

## Current state (checked directly, not assumed)

- `signers.email` is `not null`; there is no `phone` column anywhere on
  `signers` (checked every migration). The signing link itself is
  `${appUrl()}/sign/${signingToken}` — a per-signer, unguessable token,
  completely decoupled from how it gets delivered. WhatsApp delivery
  would send this exact same link, not a new kind of link or flow.
- Every signer-facing send today goes through `src/lib/email.ts` via
  Resend: `sendSignerInviteEmail`, `sendReminderEmail`,
  `sendVerificationCodeEmail` (the per-recipient OTP — also email, not
  SMS), `sendSignerDocGateEmail`, `sendSignerOpenedEmail`. Zero SMS or
  WhatsApp code exists (`whatsapp`/`twilio`/`sms` don't appear anywhere
  in `src`, outside two competitor-comparison pages' plain-text copy).
- Two UI entry points create a signer today, both email/name only, no
  phone field: `field-editor.tsx`'s manual "+ Add recipient" row
  (`newName`/`newEmail`), and the "detected signers" guided flow
  (`signerInputs`, same two fields per row). Both feed the same
  `PUT /signers` route, which requires every recipient to have a valid
  email — a real validation rule that would need to change, not just a
  UI addition.
- The existing "Customize invite email" feature
  ([[recipient-notice-feature]], `documents.invite_subject`/
  `invite_message`) lets a sender free-type their own subject/message
  per document. This doesn't map onto WhatsApp for free — see below.

## What WhatsApp delivery actually requires

The code is the smaller half of this. The real complexity is three
external, non-negotiable platform requirements that have nothing to do
with SignedBy's own engineering:

**1. A Meta WhatsApp Business Account (WABA), Business-verified.**
Sending WhatsApp messages as a business requires a verified Meta
Business Manager account and a dedicated business phone number for the
sender — not a number already active on personal WhatsApp. Business
verification is Meta's own process, typically days, sometimes longer,
and isn't something buildable or acceleratable from here — a genuine
"your step" external dependency, same category as the Trustpilot BCC
address or a TSA account signup elsewhere in this project, just with a
real approval queue attached.

**2. Pre-approved message templates — the actual hard constraint.**
A signing invite is business-initiated, not a reply inside a customer's
own 24-hour conversation window, so WhatsApp requires it to use a
template pre-submitted to and approved by Meta: fixed structure, named
variable slots (like `{{1}}` for a name, `{{2}}` for a link), reviewed
before it can send a single message. This is a materially bigger
constraint than it sounds: **the free-text flexibility the "Customize
invite email" feature already gives senders doesn't carry over.**
Realistic options once this is being built: one fixed, SignedBy-authored
template (simplest, no per-org customization at all), or a small,
pre-approved set of template variants covering the common cases — but
never truly free-text per-document the way email is today. Template
review can also just reject wording (policy reasons aren't always
obvious upfront), so this isn't a one-shot, either.

**3. Real per-message cost.** Meta charges per-conversation
(24-hour session), rate depending on message category (this would
likely qualify as "Utility," the cheaper transactional tier, not
"Marketing") and the recipient's country. Unlike Resend's flat email
cost, this is a genuine new variable cost line — worth sizing before
deciding whether this ships free-on-every-plan (like email invites
today) or gated to a paid tier, same reasoning already applied to
Console's metered bulk-send.

**Provider choice, the one real technical decision:** call Meta's Cloud
API directly, or go through a Business Solution Provider (Twilio,
MessageBird, 360dialog, Vonage) that brokers the same WABA/template
machinery behind a cleaner API. Twilio is the realistic default — same
account/template approval requirements either way, just a nicer SDK and
a category SignedBy could plausibly already be comfortable procuring
(same shape of vendor relationship as Resend itself). Direct-to-Meta
saves a small margin on per-message cost at the price of a rawer API.

## Code-side work (the smaller, buildable part)

- **Schema:** `signers.phone` (nullable, E.164 format). Real decision
  needed on `email`'s `not null` constraint — likely relaxed to "email
  OR phone required," not phone simply bolted on alongside a
  still-mandatory email.
- **UI:** a phone input alongside both existing email inputs in
  `field-editor.tsx` (manual add row + detected-signers flow) — small
  in isolation, but touches the same two spots every signer-creation
  surface already shares, so any downstream surface reading `signers`
  (bulk-send, template use, `/api/v1/documents`, the MCP tool, Console
  chat) needs a look too, same fan-out shape as
  [[per-recipient-authentication]] or [[recipient-notice-feature]] had.
- **New `src/lib/whatsapp.ts`**, sibling to `email.ts` —
  `sendSignerInviteWhatsApp`/`sendReminderWhatsApp` equivalents, sending
  the *same* `signingToken` link, using whichever pre-approved
  template(s) exist. Delivery-channel-only addition — no change to the
  signing flow, token model, or `/sign/[token]` page itself.
- **New env vars:** Twilio (or Meta) credentials + approved sender/
  template IDs, same pattern as `RESEND_API_KEY` today.
- **Wiring:** every current email-trigger point that would also need a
  WhatsApp branch — the send route, the reminders cron, bulk-send,
  template-use, `/api/v1/documents`. A real but bounded list, not an
  open-ended one; it's the same set `sendSignerInviteEmail`'s own
  callers already are.
- **Delivery-status tracking (optional, second pass):** WhatsApp's
  Business Platform can report sent/delivered/read status via webhook —
  same shape as [[email-bounce-tracking]]'s Resend webhook, a genuinely
  separate, smaller add-on once the core send path exists.

## Consent — a real, separate requirement, not just a nice-to-have

Meta's own commerce policy requires a business to have a documented
opt-in before first messaging a phone number on WhatsApp — this isn't
optional or a formality. Plus, unlike email, unsolicited business
messaging to a phone number runs into real regulatory territory in some
jurisdictions (TCPA-style rules in the US, similar consumer-protection
rules elsewhere) that email invites don't carry. Realistic shape: extend
the existing recipient-notice/consent pattern
([[recipient-notice-feature]], [[per-recipient-authentication]]'s
existing consent language) to cover "the sender is providing your phone
number to notify you via WhatsApp" explicitly, not silently reuse the
email-invite consent wording as if phone were interchangeable with
email.

## Roadmap

**Phase 0 — external, blocking, not buildable from here.** Meta Business
verification, a dedicated WhatsApp Business sender number, choose
Twilio vs. direct Meta, get at least one template approved. This is the
actual long pole — a "your step" item with its own approval-queue
timeline, not an engineering estimate.

**Phase 1 — core send path, once Phase 0 exists.** Schema + UI phone
field, `lib/whatsapp.ts`, wiring into the existing invite/reminder
trigger points, tier-gated given the new real per-message cost.
Comparable in code shape/size to [[per-recipient-authentication]] or
[[email-bounce-tracking]] — moderate, well-bounded, many small existing
touch points rather than one big new surface.

**Phase 2 — optional, later.** Delivery-status webhook (sent/delivered/
read), and/or a small set of additional pre-approved template variants
to partially recover some of the per-org customization email has today.

## Open decisions (not resolved here — flagging what needs an answer)

1. **Provider:** Twilio (recommended default) vs. direct Meta Cloud API?
2. **Email requirement:** does phone become a true alternative to email
   (one-or-the-other), or strictly additive (email always required,
   WhatsApp as an extra channel on top)? Changes the `not null`
   migration and the `PUT /signers` validation rule differently.
3. **Tier gating:** free-on-every-plan like email invites today, or
   paid-tier-only given the new per-message cost (same reasoning as
   Console's metered bulk-send)?
4. **Template customization:** ship with one fixed SignedBy-authored
   template only, or invest in a small pre-approved set to approximate
   today's free-text "Customize invite email" flexibility?
5. **Reminders:** do WhatsApp-invited signers also get WhatsApp
   reminders (needs its own approved template), or do reminders stay
   email-only regardless of invite channel?

## Effort (rough)

Phase 1 (code): moderate — comparable to a mid-sized existing feature
like per-recipient authentication, mostly because of the number of
existing small touch points (every signer-creation surface, every
send/reminder trigger) rather than any one piece being large.
**Phase 0 (external account/template approval) has no engineering
estimate at all — it's a waiting-on-Meta timeline, typically days,
sometimes longer, and genuinely blocks Phase 1 from being testable
end-to-end regardless of how fast the code itself gets written.**

## Status

Scoped only, not built, per [[feedback-scope-means-scope-only]]. Phase 0
(the WhatsApp Business Account + template approval) is the real
next step if this moves forward, and it's a "your step" — nothing in
Phase 0 can be done from this sandbox.
