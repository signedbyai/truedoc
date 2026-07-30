import { describe, expect, it } from "vitest";
import { describeConfirmAction, describeSendSettings } from "./console-chat";

describe("describeSendSettings", () => {
  it("states no-expiration/no-verification explicitly when neither is set", () => {
    expect(describeSendSettings({})).toBe("no expiration, no email verification required");
  });

  it("describes a valid expiration date", () => {
    const settings = describeSendSettings({ expires_at: "2026-09-30T00:00:00Z" });
    expect(settings).toContain("expires");
    expect(settings).not.toContain("no expiration");
  });

  it("flags an expiration value it couldn't parse instead of silently dropping it", () => {
    expect(describeSendSettings({ expires_at: "not a date" })).toContain("date unclear");
  });

  it("mentions verification when auth_required is true", () => {
    expect(describeSendSettings({ auth_required: true })).toContain("must verify email");
  });

  it("mentions a custom invite subject or message when present", () => {
    expect(describeSendSettings({ invite_subject: "Please sign" })).toContain("custom invite subject");
    expect(describeSendSettings({ invite_message: "Hey, quick one for you" })).toContain("custom invite message");
  });

  it("ignores a whitespace-only invite subject/message as not actually custom", () => {
    const settings = describeSendSettings({ invite_subject: "   ", invite_message: "  " });
    expect(settings).not.toContain("custom invite");
  });
});

describe("describeConfirmAction", () => {
  it("names the signer for a single send", () => {
    expect(describeConfirmAction("send_document", { signer_email: "jane@acme.com" })).toContain("jane@acme.com");
  });

  it("counts recipients for a bulk send, singular vs plural", () => {
    expect(describeConfirmAction("bulk_send", { recipients: [{ email: "a@x.com" }] })).toContain("1 recipient");
    expect(describeConfirmAction("bulk_send", { recipients: [{ email: "a@x.com" }, { email: "b@x.com" }] })).toContain(
      "2 recipients"
    );
  });

  it("always includes the send settings summary, even with no recipients array", () => {
    expect(describeConfirmAction("bulk_send", {})).toContain("no expiration");
  });
});
