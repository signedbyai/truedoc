# Google Drive / OneDrive import-export — scope

Status: SCOPED, NOT BUILT. Waiting on explicit go-ahead.

## Framing, on purpose

This started as a question about whether adding these integrations would
get SignedBy to "Zero Data Retention." It doesn't — see
`EU_TRUST_CERTIFICATIONS_SCOPE.md` and `WELCOME_EMAIL_SCOPE.md`'s neighbor
discussion for why (the audit trail and signer PII have to be retained
regardless of where the source PDF lives; that's an eIDAS/ESIGN
requirement, not an infrastructure choice). This doc scopes it purely as
what it actually is: a storage convenience, not a privacy claim. Nothing
below should be marketed as a retention/compliance feature.

## Competitive check (not assumed)

SignNow — the product SignedBy is most directly positioned against —
already ships Google Drive, Dropbox, OneDrive, Box, Egnyte, and DocuShare
integration: signed documents auto-sync to Drive, and files can be opened
directly into SignNow via Drive's "Open with" menu. This is table-stakes
parity for this product category, not a differentiator the way Blockchain
Anchoring or EuroTSA are — worth being honest about that framing so it
doesn't get pitched as more than it is.

## What it actually is: two separate features sharing one OAuth layer

**Import (source document picker).** Today, starting a document means
uploading a local file (`new-document-client.tsx`'s upload dropzone,
presigned direct upload to R2). This adds a "Choose from Drive" / "Choose
from OneDrive" option alongside it, using each provider's own file-picker
widget (Google Picker API, OneDrive's file picker SDK) — picks a file,
downloads it server-side (or browser-side, mirroring the existing
presigned-upload pattern), same pipeline from there on.

**Export (completed-document sync).** After a document completes
(`sendCompletionEmail`'s trigger point), optionally push the signed PDF +
certificate to a folder in the sender's connected Drive/OneDrive
automatically — the "you never have to come back and download it"
convenience SignNow's auto-sync offers.

These share one thing (OAuth connection to the provider) but are
independently useful — a customer might want only one.

## Real cost: two new OAuth integrations, not a small add

Unlike a "Sign in with X" login button, this needs **file-scope OAuth**
with each provider, which is a heavier app-review bar than login-only
scopes:

- **Google Drive API** — needs a registered Google Cloud project, an OAuth
  consent screen, and (for the file-picker + broader access this needs)
  Google's own verification process for sensitive/restricted scopes —
  can take days to weeks, not instant, and requires a privacy policy URL,
  a demo video, and justification for the scope requested.
- **Microsoft Graph API (OneDrive)** — an Azure AD app registration,
  Microsoft's own publisher verification for broader distribution.

Both are real external dependencies with lead time, the same shape as
`LinkedIn_SignIn_Scope.md`'s "the cost is the platform's review lead
time, not the code" finding — sequence accordingly, don't assume this
starts working the day the code ships.

## New sub-processor / legal surface

Per the standing rule (`feedback-update-legal-pages-with-new-processors`):
connecting a customer's Drive/OneDrive account means SignedBy's servers
handle an OAuth token scoped to that account and, for export, write files
into it. That's new processing that needs `/privacy` and `/dpa` updates —
Google and Microsoft become disclosed sub-processors for any org that
connects the feature, and it needs its own consent/connection flow (an
explicit "Connect Google Drive" action, not silently on by default) since
it's opt-in per org, unlike the always-on sub-processors already listed.

Token storage needs the same encryption-at-rest bar the rest of Customer
Data gets, plus a refresh-token rotation/revocation path (disconnecting
in Settings has to actually revoke the grant with the provider, not just
delete the local row).

## Where this fits existing code

- Import: new picker option in `new-document-client.tsx`'s upload step.
- Export: a new post-completion hook alongside `sendCompletionEmail`'s
  trigger in the document-completion path.
- New tables: an org- or user-level `storage_connections` (provider,
  encrypted refresh token, connected folder/destination, connected_by,
  connected_at) — new migration.
- New Settings UI: connect/disconnect per provider, same shape as
  existing integration settings.

## Tier gating (open question, not decided here)

Precedent both ways in this codebase: templates/reminders are Starter+
gated, per-recipient auth is free-on-every-plan. No strong argument yet
for which side this lands on — worth a decision before building, not
during.

## Explicitly out of scope for v1

- Dropbox, Box, Egnyte, DocuShare (SignNow's fuller list) — Google Drive +
  OneDrive cover the two largest consumer/SMB platforms; the others are a
  "if this proves used" extension, not v1.
- Two-way sync / watching a Drive folder for new documents to
  auto-import — a much bigger feature (polling or webhook infrastructure
  per provider); this scope is one-shot pick-a-file / push-on-complete
  only.
- Any framing of this as a retention or privacy feature — see framing
  note at top.

## Effort

Medium-large — not a quick add. Two full OAuth integrations (each with
external review lead time outside SignedBy's control), a new
credential-storage surface with real security requirements, a new
migration, and a `/privacy`+`/dpa` update. Comparable in shape to
`BROWSER_EXTENSION_GMAIL_SCOPE.md`'s "needs the personal-access-token
auth flow designed" open item, times two providers.

## Open questions
- Import only, export only, or both for v1? They're independently
  shippable — could stage export first (simpler: no picker UI, just a
  write) if that's the higher-value half.
- Free or paid-tier gate?
- Google verification review realistically takes days-to-weeks — worth
  starting that application early even if the rest of the build is
  sequenced later, since it's on the critical path either way.
