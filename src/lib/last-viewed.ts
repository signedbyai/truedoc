// "Last viewed 2m ago" recency for sender-facing document lists (v3 item
// #1, inspired by DocTrack's live tracker card). Pure logic only — the
// pages that show this do their own Supabase queries and feed results in,
// same split as page-view-tracking.ts, so everything here is unit-testable
// without a client.
//
// Two sources, merged, newest wins:
// - audit_events with event_type "viewed" — written for every org on a
//   signer's FIRST open of their link (sign/[token]/page.tsx), so free
//   orgs get first-open recency.
// - document_page_views.last_viewed_at — the engagement tracker's rolling
//   timestamp (Starter+ only, flushed every 10s while a signer reads), so
//   paid orgs get true "2 minutes ago" freshness.

/** Latest of a set of ISO timestamps; null when nothing usable. */
export function latestTimestamp(values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const v of values) {
    if (!v) continue;
    const t = Date.parse(v);
    if (Number.isNaN(t)) continue;
    if (!best || t > Date.parse(best)) best = v;
  }
  return best;
}

/** Reduce (documentId, at) rows to each document's single latest view. */
export function latestViewedByDocument(
  rows: { documentId: string; at: string | null | undefined }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const { documentId, at } of rows) {
    if (!at) continue;
    const t = Date.parse(at);
    if (Number.isNaN(t)) continue;
    const current = map.get(documentId);
    if (!current || t > Date.parse(current)) map.set(documentId, at);
  }
  return map;
}

/**
 * Short human recency: "just now", "4m ago", "3h ago", "yesterday",
 * "5d ago", then a plain date once it's over a week old. Server-rendered
 * (no live ticking) — fresh enough since it re-renders on every page load,
 * which is exactly when a sender is looking.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso);
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (diffSeconds < 60) return "just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}
