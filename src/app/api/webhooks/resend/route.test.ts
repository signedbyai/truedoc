import { describe, it, expect } from "vitest";
import { resolveEventOutcome } from "./resolve-event-outcome";

describe("resolveEventOutcome", () => {
  it("maps email.bounced to bounced and notifies the sender", () => {
    expect(resolveEventOutcome("email.bounced")).toEqual({ status: "bounced", notifySender: true });
  });

  it("maps email.suppressed to suppressed and notifies the sender", () => {
    expect(resolveEventOutcome("email.suppressed")).toEqual({ status: "suppressed", notifySender: true });
  });

  it("maps email.complained to complained but does NOT notify the sender", () => {
    // A complaint means the email DID arrive — nothing for the sender to
    // fix, so this is dashboard-badge-only, not a proactive email.
    expect(resolveEventOutcome("email.complained")).toEqual({ status: "complained", notifySender: false });
  });

  it("maps email.delivered/delivery_delayed/sent/failed without notifying", () => {
    expect(resolveEventOutcome("email.delivered")).toEqual({ status: "delivered", notifySender: false });
    expect(resolveEventOutcome("email.delivery_delayed")).toEqual({ status: "delayed", notifySender: false });
    expect(resolveEventOutcome("email.sent")).toEqual({ status: "sent", notifySender: false });
    expect(resolveEventOutcome("email.failed")).toEqual({ status: "send_failed", notifySender: false });
  });

  it("ignores event types this route doesn't act on", () => {
    for (const type of ["email.opened", "email.clicked", "email.scheduled", "email.received", "domain.created", "contact.created"]) {
      expect(resolveEventOutcome(type)).toEqual({ status: null, notifySender: false });
    }
  });

  it("ignores an unrecognized/future event type", () => {
    expect(resolveEventOutcome("email.something_new_resend_added")).toEqual({ status: null, notifySender: false });
  });
});
