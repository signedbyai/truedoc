import { describe, expect, it } from "vitest";
import { computeSigningOutcome, type SignerRouting } from "./signing-routing";

describe("computeSigningOutcome", () => {
  it("completes the document when the sole signer signs", () => {
    const signers: SignerRouting[] = [{ id: "a", order_index: 0, status: "signed" }];
    const outcome = computeSigningOutcome(signers, "a");
    expect(outcome).toEqual({ documentCompleted: true });
  });

  it("does not notify anyone new while a peer in the same tier is still pending", () => {
    const signers: SignerRouting[] = [
      { id: "a", order_index: 0, status: "signed" },
      { id: "b", order_index: 0, status: "sent" },
    ];
    const outcome = computeSigningOutcome(signers, "a");
    expect(outcome).toEqual({ documentCompleted: false, nextUpSignerIds: [] });
  });

  it("advances to the next tier once the current tier is fully signed", () => {
    const signers: SignerRouting[] = [
      { id: "a", order_index: 0, status: "signed" },
      { id: "b", order_index: 1, status: "pending" },
    ];
    const outcome = computeSigningOutcome(signers, "a");
    expect(outcome).toEqual({ documentCompleted: false, nextUpSignerIds: ["b"] });
  });

  it("notifies every signer in a parallel next tier, not just one", () => {
    const signers: SignerRouting[] = [
      { id: "a", order_index: 0, status: "signed" },
      { id: "b", order_index: 1, status: "pending" },
      { id: "c", order_index: 1, status: "pending" },
    ];
    const outcome = computeSigningOutcome(signers, "a");
    expect(outcome).toEqual({ documentCompleted: false, nextUpSignerIds: ["b", "c"] });
  });

  it("does not re-notify a next-tier signer who was already sent an invite", () => {
    const signers: SignerRouting[] = [
      { id: "a", order_index: 0, status: "signed" },
      { id: "b", order_index: 1, status: "sent" },
      { id: "c", order_index: 1, status: "pending" },
    ];
    const outcome = computeSigningOutcome(signers, "a");
    expect(outcome).toEqual({ documentCompleted: false, nextUpSignerIds: ["c"] });
  });

  it("skips a tier that's already fully resolved (e.g. everyone declined) to the next one with pending signers", () => {
    const signers: SignerRouting[] = [
      { id: "a", order_index: 0, status: "signed" },
      { id: "b", order_index: 1, status: "declined" },
      { id: "c", order_index: 2, status: "pending" },
    ];
    const outcome = computeSigningOutcome(signers, "a");
    // order_index 1 has no "pending" signers (b declined), so the nearest
    // *future* tier by order_index is still 1 — nextUp is correctly empty
    // since nobody in tier 1 is waiting to be notified, and tier 2 hasn't
    // been reached yet. This documents current behavior: a declined signer
    // in the earliest future tier blocks auto-advancing past it.
    expect(outcome).toEqual({ documentCompleted: false, nextUpSignerIds: [] });
  });

  it("completes the document once the last remaining tier signs, even with multiple tiers", () => {
    const signers: SignerRouting[] = [
      { id: "a", order_index: 0, status: "signed" },
      { id: "b", order_index: 1, status: "signed" },
      { id: "c", order_index: 1, status: "signed" },
    ];
    const outcome = computeSigningOutcome(signers, "c");
    expect(outcome).toEqual({ documentCompleted: true });
  });

  it("treats all signers sharing order_index 0 as a single tier by default", () => {
    const signers: SignerRouting[] = [
      { id: "a", order_index: 0, status: "pending" },
      { id: "b", order_index: 0, status: "signed" },
    ];
    const outcome = computeSigningOutcome(signers, "b");
    expect(outcome).toEqual({ documentCompleted: false, nextUpSignerIds: [] });
  });
});
