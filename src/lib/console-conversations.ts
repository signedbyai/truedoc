import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";

// Shared types/helpers for the console chat history feature (migration
// 0041_console_conversations.sql) — split out of the two API route files
// (src/app/api/console/conversations/route.ts and .../[id]/route.ts) since
// Next 16 forbids non-handler exports from route.ts itself (see
// [[nextjs-route-export-constraint]]); both routes import from here
// instead of one importing from the other.

// Kept in sync with console-chat.tsx's own `Bubble` type by hand — this is
// the persisted subset of it (2026-08-02 bug fix: `link`, `sealed`, and
// `certificateModeChoice` were missing here, so Zod's default "strip
// unknown keys" behavior silently dropped them from every saved turn even
// though the client sent them. A document-upload/seal reply would save
// fine as far as the API was concerned — 200 OK, title derived correctly —
// but reopening that conversation from History showed the assistant's text
// with no "Open in editor" / "Copy verify link" / download buttons at all,
// which is what "the links to files produced don't show up in the
// history" was actually describing: not a truncated request, a silently
// stripped response field). If Bubble ever gains another optional field
// that should survive a reload, add it here too.
export type ConsoleConversationMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      confirm?: { tool: string; arguments: Record<string, unknown> };
      link?: { href: string; label: string };
      certificateModeChoice?: { documentId: string; filename: string };
      sealed?: { documentId: string; verifyUrl: string; hasSignedFile: boolean; hasCertificateFile: boolean };
      // Free-plan doc-cap hit (2026-08-02, CONSOLE_FREE_TIER_SCOPE.md) —
      // added here alongside the Bubble type change, per this file's own
      // doc comment above, so it doesn't repeat the exact bug this comment
      // describes.
      capReached?: boolean;
    };

export const consoleConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  confirm: z.object({ tool: z.string(), arguments: z.record(z.string(), z.unknown()) }).optional(),
  link: z.object({ href: z.string(), label: z.string() }).optional(),
  certificateModeChoice: z.object({ documentId: z.string(), filename: z.string() }).optional(),
  sealed: z
    .object({
      documentId: z.string(),
      verifyUrl: z.string(),
      hasSignedFile: z.boolean(),
      hasCertificateFile: z.boolean(),
    })
    .optional(),
  capReached: z.boolean().optional(),
});

const MAX_TITLE_LENGTH = 60;

/** Derives a conversation's title from its first user message — pure, so
 *  it's unit-testable without a DB round trip (same extract-the-pure-part
 *  precedent as resolveActiveOrgId in org.ts). Server-derived rather than
 *  client-supplied so there's one source of truth for what a saved chat
 *  session is titled; collapses whitespace/newlines (a bulk-send file
 *  paste can be a long multi-line message) and truncates so the sidebar
 *  list stays scannable. */
export function deriveConversationTitle(messages: ConsoleConversationMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const flattened = firstUser.content.replace(/\s+/g, " ").trim();
  if (!flattened) return "New chat";
  return flattened.length > MAX_TITLE_LENGTH ? `${flattened.slice(0, MAX_TITLE_LENGTH).trimEnd()}…` : flattened;
}

/** Shared auth+access guard for the console-conversations routes — same
 *  Pro+ gate as /api/console/chat itself (apiAccess || consoleAccess):
 *  chat history is part of the console product, not a separately gated
 *  surface. Returns either the resolved ids or a ready-to-return
 *  NextResponse error, so callers do
 *  `const ctx = await requireConsoleAccess(); if ("error" in ctx) return ctx.error;`
 *  and otherwise use ctx.orgId/ctx.userId. */
export async function requireConsoleAccess(): Promise<{ orgId: string; userId: string } | { error: NextResponse }> {
  const ctx = await getUserAndOrg();
  if (!ctx) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const { orgId, orgs, user } = ctx;
  const org = orgs.find((o) => o.id === orgId);
  if (!org) return { error: NextResponse.json({ error: "Org not found" }, { status: 404 }) };
  const hasAccess = planHasFeature(org.plan, "apiAccess") || planHasFeature(org.plan, "consoleAccess");
  if (!hasAccess) {
    return { error: NextResponse.json({ error: "Console requires the Pro plan or higher.", upgrade: true }, { status: 402 }) };
  }
  return { orgId, userId: user.id };
}
