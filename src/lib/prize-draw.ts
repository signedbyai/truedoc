// Monthly prize draw shown on the dashboard: cross a threshold of genuinely
// completed signatures in a calendar month and you're entered.
//
// WHY A MONTHLY DRAW, not "first to N wins".
// First-past-the-post has exactly one winner ever. The moment it's claimed the
// promotion is over, the pill is advertising a prize that no longer exists,
// and everyone behind the leader has no reason to try — the opposite of what a
// gamified card is for. A monthly draw stays live, gives every qualifier a
// reason to care, and caps the spend at one voucher a month.
//
// WHAT COUNTS, and why it isn't the badge number.
// The badge counts documents sent, which is fine for a badge nobody wins money
// for. Attach $100 and "sent" becomes trivially gameable: send yourself a
// hundred documents in an afternoon. So the draw counts DISTINCT RECIPIENTS
// WHO ACTUALLY SIGNED, and drops anyone in the org's own member list. Signing
// requires the recipient to open a link and act, so each unit of progress needs
// a real person to do something. The two numbers will differ, deliberately.

// One voucher a month. Set deliberately low relative to the "100 documents"
// first suggested: that was an all-time target, and this is per calendar month,
// which is a much harder bar — on a beta-sized userbase a monthly 100 would go
// unwon indefinitely and the pill would be decoration. Change here and the copy
// follows automatically.
export const PRIZE_THRESHOLD = 25;

export const PRIZE_LABEL = "$100 voucher";

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
  // do, it just can't count toward a cash prize.
  excludeEmails?: readonly string[];
  now: Date;
  threshold?: number;
}): PrizeProgress {
  const start = monthStart(now);
  const excluded = new Set(excludeEmails.map(normalizeEmail));

  const distinct = new Set<string>();
  for (const s of signed) {
    if (s.signedAt < start) continue;
    const email = normalizeEmail(s.email);
    // Case-insensitive dedupe: Jane@acme.com and jane@acme.com are one person,
    // and treating them as two would hand someone an easy extra point.
    if (!email || excluded.has(email)) continue;
    distinct.add(email);
  }

  const count = distinct.size;
  return {
    count,
    threshold,
    qualified: count >= threshold,
    remaining: Math.max(0, threshold - count),
  };
}
