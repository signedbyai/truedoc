// Pure logic for the signing-view page-view/engagement tracker (see
// src/components/signing-view.tsx for the wiring to real browser APIs —
// IntersectionObserver, the Page Visibility API, and fetch(keepalive) —
// and src/app/api/sign/[token]/view/route.ts for where the deltas land).
// Split out so the actual decision logic is unit-testable without a DOM.

// How often the client flushes accumulated dwell time to the server, and
// the hard cap on any single delta — a signer who leaves a tab open
// overnight (or a clock/tab-suspend edge case) shouldn't be able to report
// an absurd number of seconds for one page. Both the client and the API
// route's Zod schema reference this same constant so they can never drift
// out of sync with each other.
export const FLUSH_INTERVAL_SECONDS = 10;
export const MAX_SECONDS_PER_DELTA = 120;

/**
 * Given each currently-rendered page's IntersectionObserver ratio (how much
 * of it is visible in the viewport, 0-1), picks which single page counts as
 * "the one being read" right now — the most-visible page, but only if it
 * clears a minimum visibility threshold. Returns null when nothing clears
 * the threshold (e.g. mid-scroll between two pages, both partially visible).
 *
 * Takes plain {page, ratio} data rather than real IntersectionObserverEntry
 * objects so this stays testable without jsdom/browser APIs.
 */
export function pickMostVisiblePage(
  entries: { page: number; ratio: number }[],
  threshold = 0.5
): number | null {
  let best: { page: number; ratio: number } | null = null;
  for (const entry of entries) {
    if (entry.ratio < threshold) continue;
    if (!best || entry.ratio > best.ratio) best = entry;
  }
  return best?.page ?? null;
}

/**
 * Computes what's newly accumulated since the last flush (totals minus
 * whatever was already sent), clamps each delta to MAX_SECONDS_PER_DELTA,
 * and drops zero/negative deltas — a page whose count didn't move since the
 * last flush has nothing worth sending. Returns the deltas to send; the
 * caller is responsible for updating its own "already sent" bookkeeping
 * once the request actually succeeds (kept out of this function so a
 * failed request can be retried on the next flush instead of silently
 * losing that time).
 */
/**
 * Formats a signer's aggregated engagement (total dwell seconds across
 * however many pages they visibly spent time on) into the short string
 * shown next to their row on the document detail page, e.g. "2m 14s · 3
 * pages". Returns null when there's nothing worth showing yet (a signer who
 * opened the link but never stayed on a page long enough to register).
 */
export function formatEngagement(totalSeconds: number, pagesViewed: number): string | null {
  if (totalSeconds <= 0 || pagesViewed <= 0) return null;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const time = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const pages = `${pagesViewed} page${pagesViewed === 1 ? "" : "s"}`;
  return `${time} · ${pages}`;
}

export function computeDeltas(
  totals: Record<number, number>,
  lastSent: Record<number, number>
): { page: number; seconds: number }[] {
  const deltas: { page: number; seconds: number }[] = [];
  for (const [pageStr, total] of Object.entries(totals)) {
    const page = Number(pageStr);
    const already = lastSent[page] ?? 0;
    const delta = Math.min(total - already, MAX_SECONDS_PER_DELTA);
    if (delta > 0) deltas.push({ page, seconds: delta });
  }
  return deltas;
}
