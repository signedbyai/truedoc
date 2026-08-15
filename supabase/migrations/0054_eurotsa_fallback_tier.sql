-- EuroTSA fallback-chain wiring (EUROTSA_SCOPE.md step 9, RUNBOOK.md §9).
-- eurotsa.eu is confirmed live 2026-08-12 (HTTPS + real /tsr RFC 3161
-- signing verified end-to-end after a KMS hash-algorithm fix). The
-- three-tier chain is Sectigo (primary) -> EuroTSA (secondary) -> FreeTSA
-- (tertiary safety net) — widen the timestamp_tsa CHECK constraint added in
-- 0045_rfc3161_timestamp.sql to allow the new 'eurotsa' value.
--
-- 0045 added this column via a plain `add column ... check (...)`, which
-- Postgres names using its default convention (<table>_<column>_check) —
-- confirm the real constraint name against the live schema before running
-- this if it was ever renamed by hand.
alter table audit_events drop constraint if exists audit_events_timestamp_tsa_check;
alter table audit_events add constraint audit_events_timestamp_tsa_check
  check (timestamp_tsa in ('sectigo', 'eurotsa', 'freetsa'));
