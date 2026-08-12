# Dev/master sync — scope

Status: SCOPED, NOT BUILT. Diagnosis done, no git surgery attempted —
that's real risk (191 differing files) and shouldn't happen without a
go-ahead.

## What's actually wrong, confirmed today

`signedby-app-dev` is a real git worktree of the same repo as
`signedby-app` (not a separate clone) — `.git` points at
`signedby-app/.git/worktrees/signedby-app-dev`, on branch `dev`, currently
at `a1594fc`. Two concrete problems, not just "dev is behind":

1. **The worktree registration is broken.** `git worktree list` from
   master's side flags it `prunable`, and running any git command
   directly inside `signedby-app-dev` fails with "fatal: not a git
   repository" — the administrative link is inconsistent, likely because
   the worktree was set up against a different absolute path than where
   it's actually mounted now. This is why dev has been drifting silently:
   normal `git pull`/`git merge` from inside that directory doesn't work
   at all right now, not just "wasn't run recently."
2. **The drift itself is large.** A raw file-count diff of `src/` alone
   between the two trees: **191 files differ.** Matches what's already
   been found piecemeal — dev missing Verified Badge entirely (a
   build-breaking gap), a stale pre-button-swap hero image, missing
   product screenshots the Tier 1 preview needed (had to be copied over
   by hand), the two new trust-badge/email builds from today, and
   whatever else hasn't been specifically checked yet.

## Why this matters beyond tidiness

The standing house rule is "test UI changes in dev first, merge to
master/prod after" — every recent visible-UI scope doc in this project
cites it. That rule is currently theater: dev doesn't reliably reflect
what master looks like, so a review on dev.signedby.ai isn't actually
validating what's about to ship. Fixing this is what makes the existing
workflow rule true again, not a new process.

## Options

**A — Fix the worktree registration only, sync later.** Repair or
re-add the worktree (`git worktree repair` or remove + `git worktree add`
fresh against `dev`) so basic git commands work again inside
`signedby-app-dev`. Cheap, unblocks everything else, doesn't touch the
191-file content drift yet. Do this regardless of which option below
follows — it's a prerequisite, not an alternative.

**B — Merge master into dev.** Standard direction (master is the source
of truth; dev exists to preview before promotion). Preserves dev-only
work that genuinely should stay dev-only or dev-first (e.g. the Tier 1
homepage preview, which — per `ARACOR_INSPIRED_PRIORITIES.md` — was
deliberately committed to dev ahead of any master decision). Real
conflict-resolution work scales with the 191-file number; can't size it
precisely without attempting it, since most of that drift is probably
clean (dev simply missing newer files) rather than actual conflicting
edits to the same lines.

**C — Reset dev to master.** Fast, no merge conflicts, but throws away
any commit that only exists on dev — which, per the point above, is not
nothing right now (Tier 1 preview, at minimum). Only makes sense if you
confirm nothing currently dev-only is worth keeping, checked file-by-file
first, not assumed.

**D — Fix + merge (recommended), then establish a habit.** A once, not
a policy, doesn't prevent this recurring. After A+B land clean, the
cheapest durable fix is procedural, not technical: fast-forward dev
alongside every deploy-worthy master merge going forward (or a
periodic — weekly — sync pass) rather than treating dev as a fire-and-forget
preview branch. Worth deciding whether that's a manual habit or something
worth scripting (a `sync-dev.sh` alongside the existing
`deploy-dev.sh`/`deploy-prod.sh`).

## Effort

Worktree repair (A): small, minutes. Merge (B): unknown until attempted —
sizeable given 191 files, but likely mostly additive rather than
conflicting. Recommend doing this as its own dedicated pass, not
folded into an unrelated feature build, given the file count and that a
bad merge here could break dev worse than it already is.

## Open questions
- Confirm option D (fix, then merge, then adopt a recurring sync habit)
  is the direction, vs. B/C alone.
- Any dev-only work besides the Tier 1 preview that needs to be
  specifically preserved before a merge or reset — worth a quick manual
  check before running anything.
- Manual periodic sync vs. a script — no strong reason either way yet.
