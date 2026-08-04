# Console redesign: refocus entirely around Verified Badge — scope

Status: BUILT 2026-08-04, deploy owed. All five pieces shipped: Home
repointed to console.signedby.ai's own root; Templates tab renamed
Verified Badge, backed by a new `/api/console/verified-badge` list of
sealed documents and their outputs; the empty-state hero rebuilt with a
real dropzone + "Seal this file" button alongside the unchanged
paperclip, all three feeding the same existing chat-confirm flow per
the locked decision; `entry_point` recorded on each seal's own audit
event so usage of the three entry points is queryable; the blue/yellow
icon test wired as a real cookieless flag (`consoleHeroIconFlag`),
tracked against `console_upload_started`. Not yet deployed — same debt
as the rest of this session's work.

Original scoping note, kept for the record: direct feedback,
grounded against the current code (`console-workspace.tsx`,
`console-chat.tsx`, `console-templates-list.tsx`) before proposing
changes. Follows directly from this session's earlier decisions: Console
is now the only Verified Badge entry point (`CONSOLE_VERIFIED_BADGE_
PROVENANCE_SCOPE.md`), and Verified Badge seals are excluded from the
main Signing Dashboard (built, `VERIFIED_BADGE_DASHBOARD_VISIBILITY_
SCOPE.md`). This doc is the natural next step: if Console is where
sealing lives, Console's own UI should read that way.

## 1 — Templates tab repurposed to a Verified Badge tab

Today's pill nav (`console-workspace.tsx`, desktop lines ~452-491, mobile
~538-575) has four stops: Home, History, Templates (`FileText` icon,
`desktopSidebarTab`/`mobileSheetTab === "templates"`), and a ⋯ menu
(Settings/Logout). Templates renders `ConsoleTemplatesList` — a plain
list of the org's saved templates, Pro+-only.

**Change:** that third tab becomes "Verified Badge" — a list of this
org's sealed documents, each with its outputs (verify link, sealed PDF,
certificate, badge image — the same set already rendered inline after a
seal in chat, per the `m.sealed` block documented in `CONSOLE_VERIFIED_
BADGE_PROVENANCE_SCOPE.md`). This is the one place in the product to
find "have I sealed this, and where are the files" — exactly the role
`VERIFIED_BADGE_DASHBOARD_VISIBILITY_SCOPE.md` originally wanted to fill
in the dashboard before that was reversed.

Real templates (save-a-template, reuse-a-template) get no dedicated tab
anymore — reachable only by asking the chat directly (it already
supports `save_as_template` and using an existing template by name as
confirm-required actions). `ConsoleTemplatesList`/`/api/console/
templates` either get repointed to a new sealed-documents query or
retired — open question, not decided here. The new list needs its own
query: `documents` where `org_id` matches and `is_verified_badge = true`,
joined to the `completed` audit event for hash/timestamp and
`certificate_file_path` for cert availability — a new component, though
`ConsoleTemplatesList`'s plain-list visual pattern (name, date, action
links) is a reasonable starting point to reuse rather than a from-scratch
design.

## 2 — SHA-512 only, SHA-256 deprecated

Checked this against actual code before agreeing to it: **Console itself
already has zero SHA-256 references** — `console-workspace.tsx`,
`console-chat.tsx`, and `console-templates-list.tsx` never mention either
hash algorithm today. So there's nothing to remove from Console's current
UI; this is really a constraint on what ships in this redesign, not a
cleanup of existing copy — any new "Secured via SHA-512" style footer
(matching the reference screenshot) should say 512 and never offer or
mention 256.

**Important distinction, worth stating plainly so this isn't
over-applied:** SHA-256 is still alive in two places that are NOT the
same thing as "document hash copy" and shouldn't be touched by this —
(1) `isValidDocumentHash()` (`api/verify/hash.ts`) accepting a 64-char
SHA-256 hash for backward compatibility, since every certificate issued
before the SHA-512 switch is a real SHA-256 hash that still needs to
verify correctly — dropping that support would break every pre-switch
certificate's verify link, and (2) unrelated internal SHA-256 uses
(API-key hashing, signer auth codes, webhook HMAC signatures) that have
nothing to do with document integrity hashing at all. "Deprecate SHA-256"
means new document-facing copy only ever says SHA-512 — it doesn't mean
touching either of those two unrelated systems.

## 3 — Hero/welcome redesign ("to be tried out")

Today's empty state (`console-chat.tsx`, `messages.length === 0` block,
built 2026-08-02) already leads with a Verified Badge pitch — thumbnail
image, headline, and an instruction to "use the [paperclip] icon below."
That's the gap: it tells you where the upload control is rather than
putting one in front of you.

**Direct follow-up during scoping: the actual goal is getting someone to
upload a file immediately on first use** — not routing them through
discovering the attach icon first. Mocked up below
(`console_hero_upload_first`): a shield-check icon, "Claim your free
Verified Badge" headline (Free copy) / "Generate your Verified Badge"
(Pro+, matching the copy pattern already locked in `CONSOLE_DASHBOARD_
ENTRY_SCOPE.md`'s home-page card), and a real drag-and-drop dropzone
sitting directly in the hero card — not a text instruction pointing at
the paperclip.

**Real interaction-model question this raises, not decided:** does
dropping/selecting a file in this dropzone (a) feed the exact same
attach-menu flow already wired to the paperclip — cheapest, reuses
existing plumbing, still ends in a chat confirm step — or (b) skip
straight to a seal confirmation, closer to the reference screenshot's
direct "Generate My Badge" button? Flagging both because they're a real
scope difference (b is a new code path, not just a new entry point into
a), not deciding it here — matches your own "to be tried out" framing.

**Corrected 2026-08-04 — the composer and pill were missing from the
first mockup, not actually removed from the design.** The initial
mockup cropped out the chat composer bar (paperclip, text input, send)
entirely, which read as if Console's chat surface was being replaced —
it isn't; nothing in this doc proposes touching the composer or the pill
nav itself. Corrected mockup (`console_hero_upload_first_full_shell`)
shows the real screen anatomy: hero card, composer, and pill together.

That correction surfaced a real layout tension worth naming rather than
hiding: hero + composer + pill genuinely compete for space on a phone
screen. Proposed resolution, direct follow-up: **the empty-state hero
takes the full screen on first load; the chat composer and message
history live behind a swipe-up bottom sheet** (drag-handle affordance,
"swipe up to chat with the console"), rather than all three stacking
permanently. Mocked up as `console_hero_swipe_up_chat`. This keeps the
upload target as the single, uncompeted focus of first use — directly
serving the "someone should be uploading a file immediately on first
use" goal — while the composer stays one gesture away, not removed. This
is a real new interaction pattern (a bottom sheet / drawer), not just a
copy change — worth calling out as its own build item if this direction
is confirmed, not a trivial styling tweak alongside the others.

## 4 — Home button goes to console.signedby.ai, not the main dashboard

Today: the Home icon in both desktop and mobile pills is a hardcoded
`https://signedby.ai/dashboard` link — the main app's dashboard, not
Console's own root. Change: repoint it to Console's own root instead,
since Console is now positioned as more standalone.

**Consequence worth flagging, not assumed:** doing this removes the
*only* path back to the main dashboard from anywhere in Console today —
there's no other dashboard link in the pill, chat, or ⋯ menu. Is that
intended (Console and the Signing Dashboard become fully separate
products a user doesn't casually hop between), or should some way back
survive somewhere (e.g. inside the ⋯ menu, alongside Settings/Logout)?
Real question, not resolved here.

## Hero icon: blue vs. yellow, proposed as an actual A/B test (2026-08-04)

Feedback on the corrected dark-theme mockup: better than the current
QR-preview hero, and worth testing the icon treatment itself — a blue
badge icon (dark navy square, `#142040`, light-blue `#7cb2f9` shield-check
— close to the reference screenshot's icon) against a yellow one (brand
`#fde047` square, navy `#0f172a` icon, matching the send button's
existing yellow/navy pairing). Mocked up side by side as
`console_hero_icon_variant_ab_test`.

Framed as "see which one gets more traction" — that's a real test, not a
subjective pick, so it should run the same way the existing homepage
layout test does ([[homepage-layout-ab-test]]: cookieless, live since
2026-07-25, CTR on a defined click event is the metric). Same shape here:
assign the icon color per session/visitor (no new cookie — same
cookieless approach as the homepage test, consistent with the standing
preference to avoid new cookies, [[feedback-avoid-cookies-legal-cost]]),
and measure against a defined event — most likely "started an upload"
(file selected in the hero dropzone) rather than a page-view, since the
whole point of this redesign is getting someone to upload immediately,
not just look at the hero. Not built — flagging the mechanism so it's
scoped as a real test alongside the rest of this redesign, not decided
by eyeballing two mockups.

## Three entry points, shown together, tracked rather than split-tested (2026-08-04)

Different ask from the icon color test above: not a variant split, all
three upload entry points visible to every user at once — the dropzone,
a new "Seal this file" button sitting directly under it (same action,
just another affordance that opens the same file picker — not a new
code path), and the existing composer paperclip. Mocked up as
`console_hero_three_entry_points`. Goal is to see which one people
actually reach for first, not to pick a winner and remove the others.

**Instrumentation, proposed to reuse the existing pattern rather than
build a new analytics system:** every Verified Badge seal already writes
a `created` audit event with a `metadata` object carrying provenance
flags (`via_console`/`via_mcp`/`agent_triggered`, see `auditProvenance()`
in `console-actions.ts`). Add one more field to that same metadata —
`entry_point: "dropzone" | "seal_button" | "paperclip"` — set client-side
based on which control actually triggered the file picker. No new table,
no new migration beyond a metadata field on a JSONB column that already
exists; answering "which do people use" is then a single grouped query
over `audit_events` filtered to `verified_badge` seals, same as how the
provenance source breakdown was already going to be queried. First-touch
only matters here (which one did they reach for on their actual first
seal), so this doesn't need session-level event tracking beyond what a
single seal's audit event already captures.

## Mockups

Two produced, adapted from the reference screenshots' elements (shield
icon, upload-first hero, SHA-512 footer) rather than copied directly, per
your own framing — built against this app's actual product surface, not
the generic reference mockup's styling:

- `console_hero_upload_first` — the new welcome/empty state with the
  upload-first dropzone.
- `console_verified_badge_tab` — the repurposed third pill tab, showing
  sealed documents and their outputs in place of the old templates list.

## How to apply

Scoped and mocked up only. Four separate, real decisions bundled into
one ask — worth confirming which of the two open questions (interaction
model for the hero dropzone; whether Home fully removes the dashboard
path) you want resolved before any of this gets built, plus which parts
ship together vs. separately.
