import { describe, expect, it } from "vitest";
import { signerForArrivingSuggestion, signerForConfirmedSuggestion } from "./suggestion-binding";

const alice = { id: "alice", order_index: 0 };
const bob = { id: "bob", order_index: 1 };

describe("signerForArrivingSuggestion", () => {
  it("binds a role-tagged suggestion to the recipient in that slot", () => {
    expect(signerForArrivingSuggestion(0, [alice, bob])).toBe("alice");
    expect(signerForArrivingSuggestion(1, [alice, bob])).toBe("bob");
  });

  it("leaves it unassigned when the slot has no recipient yet", () => {
    expect(signerForArrivingSuggestion(1, [alice])).toBeNull();
    expect(signerForArrivingSuggestion(0, [])).toBeNull();
  });

  it("leaves untagged suggestions unassigned", () => {
    expect(signerForArrivingSuggestion(null, [alice, bob])).toBeNull();
  });
});

describe("signerForConfirmedSuggestion", () => {
  it("the customer's exact dead-end: recipient added first, Party-1 suggestion confirmed", () => {
    expect(
      signerForConfirmedSuggestion({ templateRole: 0, activeRecipientId: "alice", recipients: [alice] })
    ).toBe("alice");
  });

  it("prefers the explicitly selected recipient chip over the role tag", () => {
    expect(
      signerForConfirmedSuggestion({ templateRole: 1, activeRecipientId: "alice", recipients: [alice, bob] })
    ).toBe("alice");
  });

  it("ignores a stale active id that no longer matches a recipient", () => {
    expect(
      signerForConfirmedSuggestion({ templateRole: 1, activeRecipientId: "gone", recipients: [alice, bob] })
    ).toBe("bob");
  });

  it("falls back to role match, then sole recipient", () => {
    expect(
      signerForConfirmedSuggestion({ templateRole: 1, activeRecipientId: null, recipients: [alice, bob] })
    ).toBe("bob");
    expect(
      signerForConfirmedSuggestion({ templateRole: null, activeRecipientId: null, recipients: [alice] })
    ).toBe("alice");
  });

  it("stays unassigned when genuinely ambiguous (2+ recipients, no signal)", () => {
    expect(
      signerForConfirmedSuggestion({ templateRole: null, activeRecipientId: null, recipients: [alice, bob] })
    ).toBeNull();
    expect(
      signerForConfirmedSuggestion({ templateRole: 3, activeRecipientId: null, recipients: [alice, bob] })
    ).toBeNull();
  });
});
