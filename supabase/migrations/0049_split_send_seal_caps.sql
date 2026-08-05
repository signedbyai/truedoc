-- Splits the Free plan's single "3 documents/month" counter into two
-- independent pools: regular sends and Verified Badge seals (direct
-- instruction, 2026-08-05 — "the counter for the 3 signed docs and the
-- counter for the verified badges are the same counter but they should be
-- separate counters... 3 sends and 3 seals").
--
-- The old cap (checkFreePlanDocCap in plan.ts) counted every `documents`
-- row created this month via created_at, checked at UPLOAD/CREATE time —
-- before it was even known whether the document would end up sent to a
-- signer or sealed as a Verified Badge. That's what forced the two actions
-- to share one counter. The fix moves the check to each action's actual
-- COMPLETION moment (send, seal) instead of creation, which needs its own
-- timestamp per action rather than reusing created_at.
alter table documents add column if not exists sent_at timestamptz;
alter table documents add column if not exists sealed_at timestamptz;

comment on column documents.sent_at is
  'Set by POST /api/documents/[id]/send (and the REST API''s create+send route) the moment a document is actually sent to a signer. Drives the Free plan''s 3-sends/month cap — see checkFreePlanSendCap in lib/plan.ts. Null for drafts and for Verified Badge seals, which never go through the send route.';
comment on column documents.sealed_at is
  'Set by sealDocumentAction (lib/verified-badge-actions.ts) the moment a Verified Badge seal completes. Drives the Free plan''s separate 3-seals/month cap — see checkFreePlanSealCap in lib/plan.ts.';
