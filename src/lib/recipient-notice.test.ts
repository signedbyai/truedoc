import { describe, expect, it } from "vitest";
import { defaultRecipientNotice } from "./recipient-notice";

describe("defaultRecipientNotice", () => {
  it("mentions per-page dwell time when the org has page-view tracking", () => {
    const text = defaultRecipientNotice(true);
    expect(text).toContain("how long you spend on each page");
  });

  it("omits the per-page claim for orgs without page-view tracking", () => {
    const text = defaultRecipientNotice(false);
    expect(text).not.toContain("how long you spend on each page");
    expect(text).toContain("may notify the sender when you open the document");
  });

  it("always mentions the audit trail and how to reach the sender", () => {
    for (const flag of [true, false]) {
      const text = defaultRecipientNotice(flag);
      expect(text).toContain("audit trail");
      expect(text).toContain("Please contact the sender with any privacy questions.");
    }
  });
});
