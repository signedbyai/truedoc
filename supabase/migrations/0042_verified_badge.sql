-- Verified Badge (VERIFIED_BADGE_SCOPE.md): the self-sign pivot (decision 6)
-- means no signer-less primitive and no per-signer identity columns are
-- needed — a Badge is an ordinary document sent to exactly one signer (the
-- freelancer signing their own file), reusing the existing documents/signers
-- tables and audit_events completion logic unmodified. Two real, distinct
-- additions this migration covers:
--
-- 1. Org-level identity verification (organizations columns below). This is
--    NOT the same thing as STRIPE_IDENTITY_SCOPE.md's per-signer, per-document
--    columns (identity_verified_at etc. on `signers`) — that scoped-but-not-
--    built feature has no concept of reusing a verification across a future,
--    different document, which is exactly what Verified Badge's cost/
--    friction model needs (a fresh Stripe Identity check on every seal is
--    cost-negative against the $0.25/document Console price — see decision
--    6's math). Same three-field shape, homed on `organizations` instead of
--    `signers`, genuinely new rather than falling out of that other doc's
--    work for free.
-- 2. Per-document Verified Badge bookkeeping (documents columns below): which
--    documents are Badge seals (vs. normal multi-party documents), and where
--    the standalone certificate PDF lives for the "separate"/"both"
--    certificateMode choices (see console-actions.ts / verified-badge-actions.ts).
--    The "appended" PDF and the untouched original both already have a home
--    (signed_file_path and file_path respectively) — no new column needed
--    for either of those.

alter table organizations
  add column if not exists identity_verified_at timestamptz,
  add column if not exists stripe_identity_verification_session_id text,
  add column if not exists identity_verified_name text,
  add column if not exists verified_badge_certificate_mode text not null default 'ask';

alter table organizations drop constraint if exists organizations_verified_badge_certificate_mode_check;
alter table organizations add constraint organizations_verified_badge_certificate_mode_check
  check (verified_badge_certificate_mode in ('ask', 'appended', 'separate', 'both'));

comment on column organizations.identity_verified_at is
  'When this org last completed a real Stripe Identity check (ID scan + selfie), org-level and reusable across many Verified Badge seals — distinct from signers.identity_verified_at (STRIPE_IDENTITY_SCOPE.md), which is per-recipient and per-document. Null until the org''s first self-sign seal.';
comment on column organizations.stripe_identity_verification_session_id is
  'Most recent Stripe Identity VerificationSession id for this org. SignedBy never stores the ID document image or biometric data — Stripe retains that, SignedBy only gets pass/fail + the verified name back (same data-handling boundary as STRIPE_IDENTITY_SCOPE.md).';
comment on column organizations.identity_verified_name is
  'The name Stripe confirmed off the ID document on the most recent check — printed on the sealed certificate page, distinct from whatever the org/signer typed.';
comment on column organizations.verified_badge_certificate_mode is
  'Org preference for the appended/separate/both question console chat asks before each seal (VERIFIED_BADGE_SCOPE.md). ''ask'' (default) means the conversational flow runs every time; any other value skips the question and uses that mode automatically. Adjustable via PATCH /api/org/console-settings, same permission level as the spend-cap toggle.';

alter table documents
  add column if not exists is_verified_badge boolean not null default false,
  add column if not exists certificate_mode text,
  add column if not exists certificate_file_path text;

alter table documents drop constraint if exists documents_certificate_mode_check;
alter table documents add constraint documents_certificate_mode_check
  check (certificate_mode is null or certificate_mode in ('appended', 'separate', 'both'));

comment on column documents.is_verified_badge is
  'True for a Verified Badge self-sign seal (console/MCP only — see seal_document), false for every normal send/sign document. Distinguishes the two on /verify, the dashboard documents list, and anywhere else "is this a signature request or a seal" matters.';
comment on column documents.certificate_mode is
  'The resolved appended/separate/both choice for this specific seal (only meaningful when is_verified_badge is true). Appended bakes the certificate into signed_file_path; separate/both also populate certificate_file_path with a standalone certificate-only PDF. The untouched original is always available via the existing file_path column regardless of mode.';
comment on column documents.certificate_file_path is
  'R2 key for the standalone certificate-only PDF generated in separate/both certificateMode (buildStandaloneCertificatePdf in generate-signed-pdf.ts). Null for appended-only seals and for every normal (non-Badge) document.';
