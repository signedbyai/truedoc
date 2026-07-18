// Workspace stats + the badge ladder shown on the dashboard's "Your workspace"
// card. Pure functions over a status tally, so the rules are testable without
// a database and the page stays a thin caller.
//
// SCOPE — org-level today, per-user later.
// The maths here doesn't care whose documents it counted; it takes a tally.
// Swapping to per-user is therefore a change to the *query*, not to this file:
// see getStatusCountsQuery's comment in the dashboard page.
//
// But it isn't only a toggle, and it's worth knowing before it's promised:
// `documents` has no created_by column, and `audit_events` records signer_id
// (the recipient) rather than the sender, so nothing in the schema records who
// created a document. Per-user stats need a migration adding
// documents.created_by, and historical rows can't be backfilled from any
// existing data — every user's personal count would necessarily start at zero
// on the day that ships. That's a product decision, not just a plumbing one:
// an org with 200 signed documents would show its owner "0 sent" the morning
// after the toggle appears.

export type DocumentStatus = "draft" | "sent" | "completed" | "declined" | "voided";

export type StatusCounts = Record<DocumentStatus, number>;

export const EMPTY_COUNTS: StatusCounts = {
  draft: 0,
  sent: 0,
  completed: 0,
  declined: 0,
  voided: 0,
};

export type BadgeId = "first-send" | "finding-feet" | "signing-wizard" | "paperwork-slayer";

export type Badge = {
  id: BadgeId;
  label: string;
  // Documents actually sent for signature (drafts don't count — the badge is
  // for finishing the job, and a draft is unfinished).
  threshold: number;
};

// Volume, not completion rate. Rate isn't fully in the sender's control — the
// signer decides whether to sign — and on small numbers it's meaningless: one
// document signed would make someone a 100% "wizard". Volume is something the
// user controls, and it only ever goes up, so a badge can never be taken away
// or read as a rebuke. Rate is still surfaced as a stat; it just doesn't earn
// the hat.
export const BADGES: readonly Badge[] = [
  { id: "first-send", label: "First send", threshold: 1 },
  { id: "finding-feet", label: "Getting the hang of it", threshold: 10 },
  { id: "signing-wizard", label: "Signing wizard", threshold: 50 },
  { id: "paperwork-slayer", label: "Paperwork slayer", threshold: 100 },
] as const;

// Below this many resolved documents, the completion rate is noise — 1 of 1 is
// "100%", which tells nobody anything and would make the number look broken
// the moment a second document declines. Hidden until it can mean something.
export const MIN_RESOLVED_FOR_RATE = 3;

export type WorkspaceStats = {
  // Ever left draft. Not `counts.sent`, which is only the in-flight ones.
  sent: number;
  signed: number;
  // Documents that reached a decision. Still-open ones are excluded rather
  // than counted as failures — a document out for signature isn't a loss yet.
  resolved: number;
  // null until MIN_RESOLVED_FOR_RATE, so callers render nothing rather than a
  // misleading number.
  completionRate: number | null;
  earned: Badge | null;
  next: Badge | null;
};

export function workspaceStats(counts: StatusCounts): WorkspaceStats {
  const sent = counts.sent + counts.completed + counts.declined + counts.voided;
  const signed = counts.completed;
  const resolved = counts.completed + counts.declined + counts.voided;

  const completionRate =
    resolved >= MIN_RESOLVED_FOR_RATE ? Math.round((signed / resolved) * 100) : null;

  // Highest threshold cleared, and the next one up. Both null-safe: a brand
  // new workspace earns nothing and is pointed at "First send", which is why
  // the card can show a prompt instead of a row of zeroes.
  let earned: Badge | null = null;
  let next: Badge | null = null;
  for (const badge of BADGES) {
    if (sent >= badge.threshold) earned = badge;
    else if (next === null) next = badge;
  }

  return { sent, signed, resolved, completionRate, earned, next };
}

// Tally a list of status strings. Unknown statuses are ignored rather than
// throwing — a status added to the DB before this file knows about it should
// not blank out someone's dashboard.
export function tallyStatuses(statuses: readonly string[]): StatusCounts {
  const counts: StatusCounts = { ...EMPTY_COUNTS };
  for (const s of statuses) {
    if (s in counts) counts[s as DocumentStatus] += 1;
  }
  return counts;
}
