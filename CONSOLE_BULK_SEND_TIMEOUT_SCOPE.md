# Console bulk-send: timeout safety ceiling — scope

Status: **built 2026-07-31** (option 1 below only — not #2 or #3). Covers what
to do about `bulkSendAction`'s loop having no ceiling at all now that the
200-recipient cap was removed (2026-07-31) — a genuinely large batch risks
the serverless function timing out mid-run instead of stopping cleanly.

## What actually got built

Option 1, as recommended below, closing open questions 1 and 2 by setting
an explicit ceiling rather than waiting to confirm the platform default:

- `export const maxDuration = 60` added to both routes that can trigger a
  `bulk_send` (`api/console/chat/route.ts`, `api/v1/documents/bulk-send/
  route.ts`) — a known, explicit 60s ceiling instead of an unconfirmed
  platform default.
- `bulkSendAction` (`console-actions.ts`) now tracks elapsed wall-clock time
  and stops the loop once 45s have passed (`BULK_SEND_TIME_BUDGET_MS`),
  leaving ~15s of headroom for request overhead. Checked first in the loop,
  ahead of the spend-cap check, so a batch that's already run long doesn't
  spend more time on another cap round-trip before bailing. The very first
  recipient always gets a real attempt — elapsed time is ~0 at the top of
  the loop, so this can only trip on a later iteration.
- New `skippedTimeoutReached: string[]` in `bulkSendAction`'s return shape,
  parallel to the existing `skippedCapReached` — the two are mutually
  exclusive per call (the loop breaks on whichever trips first).
- Console chat (`console-chat.ts`) reports a timeout stop differently from a
  cap stop: it lists the actual remaining email addresses and tells the
  user to just say "continue" — since chat history carries that list
  forward, a follow-up turn has everything needed to re-issue `bulk_send`
  with exactly who's left.
- The API route (`bulk-send/route.ts`) returns `skipped_timeout_reached`
  (array) + a `note` telling the caller to re-submit those recipients in a
  follow-up call — same shape as the existing `skipped_cap_reached` field.

Options #2 (small-batch concurrency) and #3 (async/queue rewrite) below were
**not** built — left as documented options if #1 turns out to be
insufficient once real batch sizes are observed.

## Why this exists

The 200-recipient cap on console's `bulkSendAction` (`console-actions.ts`,
shared by console chat's `bulk_send` tool and `/api/v1/documents/bulk-send`)
was dropped on direct instruction: both callers are always metered, so the
per-recipient $ spend cap already checked inside the loop is what bounds
runaway *cost* now — a separate fixed headcount limit on top of it was
redundant for that purpose.

But the headcount cap was also, incidentally, a timeout safety valve, and
removing it removed that too. `bulkSendAction`'s loop is fully sequential —
for each recipient it awaits a cap check, then a full `sendDocumentAction`
(document insert, signer insert, field-map insert, an MX check, and an
awaited Resend send), one recipient fully finished before the next starts.
All of that runs inside a single request/function invocation with no
`maxDuration` set anywhere in this codebase (checked — no route sets one,
no `vercel.json` `functions` block either), so it's running under whatever
Vercel's plan-default timeout is. A batch large enough to exceed that gets
killed by the platform mid-loop: some recipients already got real documents
created and emailed, others didn't, and the caller gets a hard timeout/500
with no structured answer to "how far did it get" — worse than the old cap's
clean 400 rejection, and worse than the existing spend-cap early-stop
(`skippedCapReached`), which already handles this exact shape of problem for
a different stopping reason.

Not to be confused with `MAX_TOOL_STEPS` in `console-chat.ts` (2026-07-31) —
that bounds how many Mistral tool-call round-trips one chat turn can chain
(list_templates → send_document's confirm, etc.), a completely separate loop
from the per-recipient loop inside a single `bulk_send` tool call this doc
is about.

## Options considered

**1. Time-budget graceful early-stop (recommended).** Track elapsed wall-clock
time in the loop; once it crosses a safe budget, stop and return cleanly —
extending the existing `skippedCapReached` shape with a second reason
(e.g. `skippedTimeoutReached`) rather than inventing a new response shape.
Console chat can tell the user "sent the first N, M left — want me to
continue?" and just re-issue `bulk_send` with the remaining recipients; an
API caller gets the same list back to retry in a follow-up call. This is
"soft" in the sense that a batch of any size still gets as much done as
safely fits in one call, with the remainder cleanly reported rather than the
request being killed with no visibility into what succeeded. Lowest-lift
option — a few lines in the existing loop, no new schema, no new
infrastructure.

**2. Small-batch concurrency, layered on top of #1.** The loop today is
fully sequential per recipient. Sending in small concurrent batches (e.g.
5-10 at once via `Promise.all`) would multiply how many recipients fit
inside any given time budget, since each recipient's send is otherwise
independent. Real nuance: the spend cap is currently checked with a
read-then-act pattern immediately before each send, which is only exactly
right when strictly sequential — under concurrency, several sends could each
pass the cap check before any of them records usage, slightly overshooting
the cap. Fix is to check the cap once per batch rather than once per
recipient (allow the whole batch, recheck before the next one), trading a
little cap precision (could overshoot by up to one batch's worth) for real
throughput. Complements #1, doesn't replace it — still needs a time-budget
stop as the backstop for however large a batch actually is.

**3. Async/background processing.** Accept the whole batch instantly (write
recipient rows to a new `bulk_send_jobs`/`bulk_send_recipients`-shaped table
with `status = 'pending'`), return an immediate job id, and process
recipients incrementally in the background (a cron sweep or a queue like
Upstash/QStash), with a new status-check endpoint or console-chat tool for
"how's my bulk send going." This is the only option that removes timeout
risk regardless of batch size, and gives natural resumability across
crashes/redeploys, not just within one call. It's also the biggest lift by
far: a new table/migration, a worker (cron or queue), a new status surface,
and a real UX change — `bulk_send` currently confirms once and returns a
result in the same turn; async means "started, check back," which changes
the conversational shape of the feature, not just its internals. Worth
doing if bulk-send volume actually grows into a recurring problem, not
speculatively now.

## Recommendation

Build #1 now — cheap, self-contained, and turns an unbounded-but-risky loop
into an unbounded-but-*safe* one without changing the feature's shape.
Treat #2 as a fast-follow once #1 is in, if real batches are routinely large
enough to hit the time budget. Leave #3 on the backlog as the real fix if
usage ever grows enough to make #1+#2 insufficient.

## Explicitly out of scope for this pass

- Any change to the dashboard's own, separate, unmetered bulk-send
  (`/api/templates/[id]/bulk-send` + `bulk-send-button.tsx`), which keeps its
  existing 200-recipient cap and isn't part of this console-only surface.
- Rewriting the spend-cap check itself — this is purely about the
  additional timeout-safety stop, not changing how `checkConsoleCap` works.

## Open questions

1. **Which Vercel plan/timeout is this actually running under?** No
   `maxDuration` is set anywhere in the codebase, so the real ceiling is
   whatever Vercel's plan default is — worth confirming directly (or just
   setting an explicit `maxDuration` on the affected routes) rather than
   guessing at the time budget's safety margin.
2. **Time budget value** — something safely under the real function timeout
   with headroom for request overhead (auth, JSON parsing, and — on the
   console-chat path specifically — the Mistral round-trip that wraps this
   call). Needs answer #1 first to pick a real number with confidence.
3. **Go ahead on #1 alone, or #1+#2 together?** #2 is a meaningfully bigger
   diff (touches the cap-check timing/correctness, not just adds a clock
   check) for a real but smaller marginal gain once #1 exists.
