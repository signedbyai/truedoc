// Pure mapping, kept in its own file (not route.ts) since Next 16 forbids
// non-handler exports from a route.ts file — tsc doesn't catch that, only a
// real `next build` does. See DOCUMENT_ARCHITECTURE.md / prior migrations
// hitting the same constraint (schema.ts/hash.ts siblings elsewhere).

// See BOUNCE_TRACKING_SCOPE.md. Maps each Resend webhook event type to the
// value stored in signers.last_email_event (migration 0035). Events not
// relevant to delivery status (opened/clicked/scheduled/received/domain.*/
// contact.*) resolve to a null status and are acknowledged but ignored —
// this is delivery visibility, not full engagement tracking.
const EVENT_TO_STATUS: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
  "email.failed": "send_failed",
};

// Only these mean the invite never actually reached the signer at all — a
// real, actionable problem worth proactively emailing the sender about
// (fix the address, resend). A complaint means it DID arrive; delayed/
// failed don't get a proactive email either, just the dashboard badge.
const NOTIFY_SENDER_EVENTS = new Set(["email.bounced", "email.suppressed"]);

export function resolveEventOutcome(eventType: string): { status: string | null; notifySender: boolean } {
  const status = EVENT_TO_STATUS[eventType] ?? null;
  return { status, notifySender: status !== null && NOTIFY_SENDER_EVENTS.has(eventType) };
}
