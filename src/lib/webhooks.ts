import { createHmac, randomBytes } from "crypto";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Outbound webhooks -- CRM/middleware readiness Phase 1, Part B/C (see
// CRM_MCP_READINESS_PHASE1_SCOPE.md, project root). Multi-destination per
// org: every enabled webhook_endpoints row gets its own independently-signed
// delivery, so one dead/retired endpoint never blocks or fails delivery to
// the others.

const SECRET_PREFIX = "whsec_";

export function generateWebhookSecret(): string {
  return SECRET_PREFIX + randomBytes(24).toString("hex");
}

export type WebhookEventType = "document.viewed" | "document.signed" | "document.completed" | "document.declined";

export type WebhookEventData = {
  document_id: string;
  title: string;
  status: string;
  // Omitted for document.completed, which isn't about one signer -- matches
  // the payload shape locked in the scope doc's Part C.
  signer?: { email: string; name: string | null };
};

function sign(secret: string, rawBody: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

// Bounds a single delivery attempt -- an org's own endpoint being slow or
// hung must never hold up the signer-facing request this is called from.
const DISPATCH_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1000;

async function deliverOnce(url: string, secret: string, rawBody: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SignedBy-Signature": sign(secret, rawBody) },
      body: rawBody,
      signal: controller.signal,
    });
    return res.ok;
  } finally {
    clearTimeout(timeout);
  }
}

// Fire-and-forget-plus-one-retry only -- no persistent delivery log or retry
// queue in phase 1 (see scope doc's "proportionate v1" reasoning, same shape
// as the bounce-tracking work). A failure here is logged and otherwise
// silent; revisit once real volume shows silent failures are a problem.
async function deliverWithRetry(endpoint: { url: string; secret: string }, rawBody: string): Promise<void> {
  const firstTry = await deliverOnce(endpoint.url, endpoint.secret, rawBody).catch(() => false);
  if (firstTry) return;

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  try {
    const ok = await deliverOnce(endpoint.url, endpoint.secret, rawBody);
    if (!ok) console.error(`Webhook delivery failed (non-2xx) for ${endpoint.url}`);
  } catch (err) {
    console.error(`Webhook delivery failed for ${endpoint.url}`, err);
  }
}

/**
 * Dispatches a document lifecycle event to every enabled webhook endpoint on
 * the org, independently (Promise.allSettled -- one endpoint being down must
 * never affect delivery to the others). Called directly at the four existing
 * audit_events insert sites this event set maps to (see
 * CRM_MCP_READINESS_PHASE1_SCOPE.md Part B/C), never awaited by the caller's
 * response -- webhook dispatch must not add latency or risk to the
 * signer-facing request it's hooked into.
 */
export async function dispatchWebhookEvent(orgId: string, event: WebhookEventType, data: WebhookEventData): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: endpoints } = await admin
      .from("webhook_endpoints")
      .select("url, secret")
      .eq("org_id", orgId)
      .eq("enabled", true);
    if (!endpoints || endpoints.length === 0) return;

    const rawBody = JSON.stringify({ event, occurred_at: new Date().toISOString(), ...data });
    await Promise.allSettled(endpoints.map((ep) => deliverWithRetry(ep, rawBody)));
  } catch (err) {
    // Must never break the flow it's hooked into -- same swallow-and-log
    // posture as the other best-effort side effects in these routes (e.g.
    // DocGate emails, speed-stat lookups).
    console.error("Webhook dispatch failed", err);
  }
}

/**
 * Schedules dispatchWebhookEvent to run after the caller's response has
 * already been sent -- via Next's after() API, so dispatch never adds
 * latency to the signer-facing request it's hooked into, and (unlike a bare
 * un-awaited promise) the serverless function is kept alive long enough to
 * actually finish the delivery/retry instead of risking a mid-flight kill.
 *
 * after() throws when called outside an active Next.js request scope --
 * which is exactly what happens when this codebase's vitest unit tests
 * invoke a route handler directly (see
 * src/app/api/sign/[token]/auth-gate-bypass.test.ts). Falls back to a plain
 * fire-and-forget call in that case so tests can still exercise the rest of
 * the route.
 */
export function scheduleWebhookEvent(orgId: string, event: WebhookEventType, data: WebhookEventData): void {
  const run = () => dispatchWebhookEvent(orgId, event, data);
  try {
    after(run);
  } catch {
    run().catch((err) => console.error("Webhook dispatch scheduling failed", err));
  }
}
