-- Badge Placer (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.1/V1.4) + the
-- payment QR that rides the same screen for Business tier (V1.5/V2.4).
-- Scoped 2026-08-06 through 2026-08-10, built 2026-08-10 (direct ask:
-- "let's go ahead and build it").
--
-- documents.badge_* — the one saved corner-stamp position for THIS
-- document's Badge Placer, overwritten in place every time the user
-- re-opens the placer and saves again. No presets table, no FK — same flat
-- shape documents.payment_link_url already uses. Only page/x/y/width are
-- stored (x/y as the box's top-left corner, normalized 0-1 fractions of the
-- page, same convention document_fields already uses); height is always
-- derived from the badge PNG's fixed aspect ratio at draw time
-- (generate-signed-pdf.ts) rather than stored, which is also what keeps
-- resize a single-dimension operation with no aspect-ratio-stretch risk to
-- guard against.
alter table documents
  add column if not exists badge_page integer,
  add column if not exists badge_x numeric,
  add column if not exists badge_y numeric,
  add column if not exists badge_width numeric,
  add column if not exists badge_stamped_file_path text;

comment on column documents.badge_page is
  'Page number (1-indexed) this document''s Badge Placer stamp was saved on. Null until a placement is saved or a seal has produced a stamp using the resolved fallback.';
comment on column documents.badge_x is
  'Normalized 0-1 x of the stamp''s top-left corner, fraction of page width. Same coordinate convention as document_fields.x.';
comment on column documents.badge_y is
  'Normalized 0-1 y of the stamp''s top-left corner, fraction of page height, measured from the top. Same coordinate convention as document_fields.y.';
comment on column documents.badge_width is
  'Normalized 0-1 width of the stamp, fraction of page width. Height is derived at draw time from the badge PNG''s fixed aspect ratio (130/300, see generate-signed-pdf.ts) — never stored, so resize is always single-dimension by construction.';
comment on column documents.badge_stamped_file_path is
  'R2 key for the corner-stamped copy of the original document — the "Badge-on sealed PDF" output. Produced unconditionally on every Verified Badge seal (V1.3a: always-on 4th output, not a mode swap), parallel to signed_file_path/certificate_file_path.';

-- organizations.last_badge_* — the org-wide remembered position, read only
-- as a brand-new document's Badge Placer starting point (never a managed
-- setting a user opens directly). Written every time ANY document's badge
-- position is saved. Bottom-right/page-1 is the fallback used only for an
-- org that has never saved one yet (resolved in code, not a stored
-- default row here).
alter table organizations
  add column if not exists last_badge_page integer,
  add column if not exists last_badge_x numeric,
  add column if not exists last_badge_y numeric,
  add column if not exists last_badge_width numeric,
  add column if not exists badge_placement_mode text not null default 'skip';

alter table organizations drop constraint if exists organizations_badge_placement_mode_check;
alter table organizations add constraint organizations_badge_placement_mode_check
  check (badge_placement_mode in ('ask', 'skip'));

comment on column organizations.last_badge_page is
  'Org-wide remembered Badge Placer position (page), read as a new document''s starting point. Bottom-right/page-1 fallback in code applies only when this and the x/y/width columns are all null (org has never saved a position).';
comment on column organizations.badge_placement_mode is
  '"skip" (default) — sealing behaves exactly as before this feature: no placement step, silently uses the remembered/fallback position. "ask" (opt-in, Settings > Verified Badge > Badge placement) — the Seal tab shows the "Place badge" row and placer before each seal. Same two-value shape as verified_badge_certificate_mode, own column/route (PATCH /api/org/badge-placement) since Console/MCP sealing has no UI to place a badge in at all.';
