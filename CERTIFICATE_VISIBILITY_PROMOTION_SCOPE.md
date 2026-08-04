# Promote the certificate of completion — scope

Status: scoped 2026-08-04, not built.

Direct ask: "people did not know they had a certificate of completion
added to the document... most people are impressed by the certificate
but never see it." Grounded against the actual code before proposing
anything — the certificate and its QR/verify link already exist and
already resolve correctly (`generateCertificateBadge()` in
`badge-asset.tsx`, baked into the signed PDF as its last page by
`generate-signed-pdf.ts`, pointing at a real `/verify?hash=...` link).
This isn't a build-the-feature problem, it's a surfacing problem — the
certificate is invisible unless someone scrolls to the end of a PDF
they may never fully open.

## Three surfaces, ranked by leverage

### 1 — Signer's own "Signed" confirmation screen (highest leverage)

`signing-view.tsx`'s `done` block (lines 945-1023) is the one moment
every signer is guaranteed to see, no email deliverability or dashboard
visit required. Today it shows nothing about the certificate — grep for
certificate/QR/verify in that file returns nothing relevant.

**Real constraint found during research:** this screen renders for
*every* signer immediately after *their own* submit, not just the last
one — but the message and download button already branch on
`documentCompleted` (whether this submission was the one that finished
the whole document). A certificate/QR isn't valid or available until
the document is fully executed, so any addition here has to live inside
the existing `documentCompleted` branch only — same gating the download
button already uses, not a new condition.

**Technical gap:** the hash used for the verify link is computed
server-side in `api/sign/[token]/submit/route.ts` (lines 170-183,
already stored on the `completed` audit event) but never returned in
the JSON response `signing-view.tsx` reads. Needs one field added to
that response (`hash` or a ready-made `verifyUrl`) before the client can
render anything. Once that exists, rendering the QR itself has a
ready-made template to copy: the same screen already generates a
dynamic PNG via a Next `ImageResponse` route for its "speed card" share
image (`speedCardUrl()`, line 764) — same pattern, different image.

### 2 — Dashboard document detail page (second highest leverage)

Worth doing regardless of whether #1 ships, because the existing
completion email's own CTA button ("View & Download Signed PDF")
already sends people to this exact page — fixing it here fixes both the
email-click path and anyone who checks the dashboard directly without
opening the email. Two problems found, not one:

- No QR/certificate preview at all — the completed-doc branch
  (`dashboard/documents/[id]/page.tsx`, ~lines 140-222) shows only a
  plain gray text line and two download buttons.
- The one existing verify mention is actually broken as a promotion
  tool: `"...anyone can verify this document at signedby.ai/verify"` is
  plain text pointing at the generic verify search form, not the real
  `signedby.ai/verify?hash=...` deep link for *this* document.

Fix: render the same `generateCertificateBadge()` QR as a small preview
card on this page, and fix the text line to link to the real
hash-bearing verify URL instead of the generic form.

### 3 — Completion email (lowest leverage, optional layer-on)

`sendCompletionEmail()` (`email.ts:453-479`) is one sentence plus a
button today — no certificate mention, no QR, no attachment. Weaker
than #1 and #2 on its own: inline images get stripped/proxied by a lot
of mail clients (Gmail's image proxy, dark-mode rendering), and it's
competing with an email a lot of people skim past rather than read.
Worth adding *after* #1/#2, not instead of them — same
`generateCertificateBadge(verifyUrl)` call, just as an inline/attached
image in the existing template.

## Open questions — not decided here

- **Build order.** My recommendation: #1 and #2 together first (both
  small, contained, both fix the actual "never see it" gap directly),
  #3 later as reinforcement. Confirm before I start.
- **Copy.** No specific wording locked yet — something like "This
  document is certified — scan to verify" alongside the QR. Real
  question, not resolved here.
- **Gating.** This is a trust/legitimacy signal, not a premium feature
  — leaning toward showing it on every plan (Free included), same as
  the existing verify page itself, rather than tying it to a paid tier.
  Flagging rather than assuming, since plan-gating has been a recurring
  real decision point elsewhere in this app.
- **Certificate download itself.** Scope above is "make the existing
  verify/QR visible," not "add a new standalone certificate download
  button" — `certificate_file_path`/`/api/documents/[id]/certificate`
  already exists but is only populated for Verified Badge's
  separate/both certificate modes, not every document. Worth a separate
  conversation if you also want a standalone download everywhere, not
  bundled into this scope.

## How to apply

Confirm build order + the gating question, then this is a same-day
build — no new migration, no new asset generation (QR generation
already exists), just wiring existing data (hash/verifyUrl) through to
two screens that don't currently receive it.
