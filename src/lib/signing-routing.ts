// Pure decision logic for what happens right after a signer submits: is the
// document now fully signed, or does the next routing tier need notifying?
// Extracted out of the submit route so this — the part of the flow that
// decides whether a legally-binding document is "complete" and who gets
// emailed next — can be unit tested without a database.
//
// Signers are grouped into tiers by order_index. Signers who share a tier
// sign in parallel; a tier only advances once every signer in it has signed.

export type SignerRouting = {
  id: string;
  order_index: number;
  status: "pending" | "sent" | "signed" | "declined";
};

export type RoutingOutcome =
  | { documentCompleted: true }
  | { documentCompleted: false; nextUpSignerIds: string[] };

export function computeSigningOutcome(allSigners: SignerRouting[], justSignedId: string): RoutingOutcome {
  const stillPending = allSigners.filter((s) => s.id !== justSignedId && s.status !== "signed");
  if (stillPending.length === 0) {
    return { documentCompleted: true };
  }

  const justSigned = allSigners.find((s) => s.id === justSignedId);
  const currentTier = justSigned?.order_index ?? 0;
  const currentTierStillPending = stillPending.some((s) => s.order_index === currentTier);
  if (currentTierStillPending) {
    // Others in the same tier haven't signed yet — nobody new to notify.
    return { documentCompleted: false, nextUpSignerIds: [] };
  }

  const futureTiers = stillPending.filter((s) => s.order_index > currentTier);
  if (futureTiers.length === 0) {
    return { documentCompleted: false, nextUpSignerIds: [] };
  }

  const nextTier = Math.min(...futureTiers.map((s) => s.order_index));
  // Only "pending" (never-notified) signers in that tier — anyone already
  // "sent" was notified by an earlier call and shouldn't get a duplicate.
  const nextUp = futureTiers.filter((s) => s.order_index === nextTier && s.status === "pending");
  return { documentCompleted: false, nextUpSignerIds: nextUp.map((s) => s.id) };
}
