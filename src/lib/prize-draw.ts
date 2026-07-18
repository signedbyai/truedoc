// Monthly gift-card draw shown on the dashboard: reach a threshold of genuine
// signatures within a calendar month and you're entered; one qualifier is
// drawn at random after the month closes.
//
// A DRAW, NOT A RACE. First-past-the-post was considered and rejected. It ends
// the moment the heaviest user crosses the line — on a small userbase that's
// the first few days — after which everyone who qualifies later can see they
// were never in contention. It also rewards volume rather than effort, so the
// same workspace wins every month through ordinary business. A random draw
// among qualifiers keeps the whole month live for everyone who gets there.
//
// The wording has to match the mechanic. "Draw" means random selection; if
// this ever changes back to first-past-the-post, the copy and the published
// terms must change with it.
//
// Resetting monthly caps the spend at one gift card a month and stops the
// promotion from ending permanently the first time it's won.
//
// WHAT COUNTS, and why it isn't the badge number.
// The badge counts documents sent, which is fine for a badge nobody wins a
// prize for. Attach a $100 gift card and "sent" becomes trivially gameable:
// send yourself a hundred documents in an afternoon. So this counts DISTINCT
// RECIPIENTS WHO ACTUALLY SIGNED. Signing needs the recipient to open a link
// and act, so every unit of progress requires a real person to do something,
// and a hundred self-sends score one. The two numbers differ, deliberately.

// One gift card a month. Set deliberately low relative to the "100 documents"
// first suggested: that was an all-time target, and this is per calendar month,
// which is a much harder bar — on a beta-sized userbase a monthly 100 would go
// unwon indefinitely and the pill would be decoration. Change here and the copy
// follows automatically.
export const PRIZE_THRESHOLD = 25;

export const PRIZE_LABEL = "$100 gift card";

// Dark until legal sign-off. Nothing about the prize renders while this is
// false — no pill, no terms link. The maths still runs (it's cheap and keeps
// the code exercised), it just isn't shown. Flip by setting
// NEXT_PUBLIC_PRIZE_ENABLED=1 in Vercel.
export const PRIZE_ENABLED = process.env.NEXT_PUBLIC_PRIZE_ENABLED === "1";

export type SignedEvent = {
  // Recipient's email, as stored on the signer row.
  email: string;
  // When they signed. Callers should already have filtered to the month, but
  // this is re-checked here so the rule lives in one place.
  signedAt: Date;
};

export type PrizeProgress = {
  // Distinct qualifying recipients this month.
  count: number;
  threshold: number;
  qualified: boolean;
  // Never negative, so callers can render it directly.
  remaining: number;
  // When the threshold was crossed — the moment of the Nth distinct signature.
  // Not the winning criterion (the draw is random among qualifiers), but kept
  // as an audit record: it evidences that a workspace qualified inside the
  // month, which is exactly what you'd need if a result were ever queried.
  // null until qualified.
  qualifiedAt: Date | null;
};

export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function prizeProgress({
  signed,
  excludeEmails = [],
  now,
  threshold = PRIZE_THRESHOLD,
}: {
  signed: readonly SignedEvent[];
  // The org's own members. Signing your own document is a legitimate thing to
  // do, it just can't count toward a prize.
  excludeEmails?: readonly string[];
  now: Date;
  threshold?: number;
}): PrizeProgress {
  const start = monthStart(now);
  const excluded = new Set(excludeEmails.map(normalizeEmail));

  // Chronological, so the Nth distinct signature is genuinely the Nth in time.
  // Counting in arbitrary order would still give the right total but a
  // meaningless qualifiedAt.
  const ordered = [...signed].sort((a, b) => a.signedAt.getTime() - b.signedAt.getTime());

  const distinct = new Set<string>();
  let qualifiedAt: Date | null = null;
  for (const s of ordered) {
    if (s.signedAt < start) continue;
    const email = normalizeEmail(s.email);
    // Case-insensitive dedupe: Jane@acme.com and jane@acme.com are one person,
    // and treating them as two would hand someone an easy extra point.
    if (!email || excluded.has(email)) continue;
    distinct.add(email);
    if (qualifiedAt === null && distinct.size >= threshold) qualifiedAt = s.signedAt;
  }

  const count = distinct.size;
  return {
    count,
    threshold,
    qualified: count >= threshold,
    remaining: Math.max(0, threshold - count),
    qualifiedAt,
  };
}
