// Pure logic for the signer-facing completion-screen speed stat (see
// src/app/api/sign/[token]/submit/route.ts for where get_signer_speed_stat
// (supabase/migrations/0018_signer_speed_stat.sql) gets called, and
// src/components/signing-view.tsx for where this is rendered). Split out
// so the gating/formatting decisions are unit-testable without a DB.

// Beyond this, the number stops being a "speed" stat and starts being
// misleading -- mainly matters for the Free-plan wall-clock fallback (see
// the migration's comment), where someone who opened a link, went to
// lunch, and came back to sign would otherwise get "you signed this in
// 3600 seconds" presented as if it were a speed claim.
export const MAX_PLAUSIBLE_SECONDS = 30 * 60;

// Below this, a percentile is more noise than signal -- "faster than 100%
// of 2 signers this month" reads as broken, not impressive. The raw time
// is still worth showing on its own; just not the comparison.
export const MIN_SAMPLE_SIZE_FOR_PERCENTILE = 5;

// A percentile only belongs on a SHARE card when it's actually flattering.
// "Faster than 13% of signers this month" is technically true and reads as an
// insult -- it means slower than 87% of them -- so as a shareable brag it
// lands backwards. Below this bar we keep the raw time (which stands on its
// own perfectly well: "In 38 seconds.") and drop the comparison.
export const MIN_PERCENTILE_TO_SHOW = 60;

// ...and cap the top end. A genuine 100th percentile renders as "faster than
// 100% of signers this month", which reads as broken rather than impressive --
// you can't be faster than everyone including yourself. Showing 99 keeps the
// claim true (they WERE faster than 99%) and sounds like a real statistic.
export const MAX_PERCENTILE_TO_SHOW = 99;

export type SpeedStat = { seconds: number; percentile: number | null };

/**
 * Turns the raw RPC output into what's safe to show a signer, or null if
 * nothing worth showing exists (implausible timing, or no timing signal at
 * all). Percentile is dropped (not the whole stat) when the comparison pool
 * is too small to mean anything, OR when the result isn't flattering enough
 * to be worth sharing.
 */
export function buildSpeedStat(raw: {
  activeSeconds: number | null;
  percentile: number | null;
  sampleSize: number | null;
}): SpeedStat | null {
  const seconds = raw.activeSeconds;
  if (seconds == null || seconds <= 0 || seconds > MAX_PLAUSIBLE_SECONDS) return null;

  const hasEnoughSample = (raw.sampleSize ?? 0) >= MIN_SAMPLE_SIZE_FOR_PERCENTILE;
  const showPercentile =
    hasEnoughSample && raw.percentile != null && raw.percentile >= MIN_PERCENTILE_TO_SHOW;
  const percentile = showPercentile ? Math.min(raw.percentile!, MAX_PERCENTILE_TO_SHOW) : null;

  return { seconds: Math.round(seconds), percentile };
}

/**
 * "38 seconds" / "1 minute 12 seconds" / "2 minutes" -- natural-language
 * phrasing for a share-worthy headline, distinct from the terser "2m 14s"
 * dashboard format in page-view-tracking.ts's formatEngagement.
 */
export function formatSpeedSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutePart = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (seconds === 0) return minutePart;
  return `${minutePart} ${seconds} second${seconds === 1 ? "" : "s"}`;
}

/**
 * The stat line baked into the share card image itself
 * (/api/share/speed-card) -- sits under a "Document signed." headline
 * rather than standing alone, so it doesn't need to repeat "you signed
 * this."
 */
export function speedStatCardLine(stat: SpeedStat): string {
  const time = formatSpeedSeconds(stat.seconds);
  if (stat.percentile == null) return `In ${time}.`;
  return `In ${time} — faster than ${stat.percentile}% of signers this month.`;
}

/**
 * Full text used both as the share-card image's alt text and as the
 * caption text handed to navigator.share -- kept as one literal sentence
 * ("Document signed." + the card line) so what a signer's share caption
 * says always matches what the card image itself shows.
 */
export function speedStatShareText(stat: SpeedStat): string {
  return `Document signed. ${speedStatCardLine(stat)}`;
}
