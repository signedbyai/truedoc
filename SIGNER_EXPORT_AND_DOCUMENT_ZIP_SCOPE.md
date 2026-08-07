# Signer contact export + bulk document zip download — scope

**Superseded 2026-08-07 — split into three dedicated docs, same day.**
This started as one combined scope for two bundled asks ("download all
prior signer emails/names" + "batch down a zip file of all the user
documents"), then grew a third related idea (auto-populating Frequent
Signers from signing history). All three ended up different enough in
design and effort to deserve their own files rather than sections of one:

- **[[signer-export-scope]]** — unique-signers CSV export (one row per
  distinct email, deduped).
- **[[auto-frequent-signers-scope]]** — the frequency-ranked sibling:
  top 10 signers by actual completed-signing frequency, auto-surfaced
  alongside the existing manually-curated Frequent Signers list.
- **[[document-zip-export-scope]]** — the bulk document archive, scoped
  as an async job (up to ~24h) rather than a synchronous download, once
  it became clear that was the real intended design.

Kept this file in place, emptied, rather than deleting it outright, since
earlier conversation history and any existing links point here — see the
three docs above for everything that used to live in this one.
