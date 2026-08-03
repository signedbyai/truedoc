-- RFC 3161 trusted timestamp (TIMESTAMP_AUTHORITY_SCOPE.md, built 2026-08-03
-- on direct instruction). Closes a real honesty gap: Verified Badge and
-- every signed document's certificate page already claim a "cryptographically
-- verified timestamp," but today that's just a plain audit_events.created_at
-- Postgres value -- nothing about it is independently verifiable without
-- trusting SignedBy's own database. A Time Stamping Authority (TSA)
-- cryptographically signs a document's hash together with the time; anyone
-- can verify that signature later trusting only the TSA, not SignedBy.
--
-- Homed on audit_events (the 'completed' row, same one that already carries
-- document_hash) rather than a new table, same reasoning as document_hash
-- itself: one row per seal/completion is the natural unit here.
--
-- timestamp_token: the raw DER-encoded RFC 3161 token, extracted back out of
-- the timestamped PDF after embedding (see src/lib/timestamp-authority.ts).
-- Persisted separately (not just trusted to exist once inside the uploaded
-- PDF) so /verify and the certificate page can read it back cheaply without
-- fetching + parsing the whole PDF from R2 on every request, and so a
-- future pass can offer live re-verification (pdf-rfc3161's
-- verifyTimestamp()) without another migration.
-- timestamp_tsa: which TSA issued the token -- 'sectigo' (primary) or
-- 'freetsa' (automatic fallback). NULL means neither TSA was reachable when
-- this document sealed (non-blocking failure -- the seal still completed,
-- just without a real trusted timestamp; falls back to the honest
-- database-only claim).
-- timestamp_gen_time: the TSA's own attested time for the token -- distinct
-- from created_at, which is only ever when SignedBy's own row was written.
alter table audit_events add column if not exists timestamp_token bytea;
alter table audit_events add column if not exists timestamp_tsa text
  check (timestamp_tsa in ('sectigo', 'freetsa'));
alter table audit_events add column if not exists timestamp_gen_time timestamptz;
