import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { runConsoleChatTurn } from "@/lib/console-chat";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(50)
    .default([]),
  confirmedTool: z
    .object({ name: z.enum(["send_document", "bulk_send"]), arguments: z.record(z.string(), z.unknown()) })
    .optional(),
});

// POST /api/console/chat — session-authenticated (not API-key), backing
// the /dashboard/console chat pane. See src/lib/console-chat.ts for the
// actual Mistral tool-calling loop; this route is just auth + gating +
// rate limiting around it, same shape as every other dashboard API route.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId, orgs } = ctx;

  const org = orgs.find((o) => o.id === orgId);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const hasApiAccess = planHasFeature(org.plan, "apiAccess");
  const hasConsoleAccess = planHasFeature(org.plan, "consoleAccess");
  if (!hasApiAccess && !hasConsoleAccess) {
    return NextResponse.json(
      { error: "Console requires the Pro plan or higher.", upgrade: true },
      { status: 402 }
    );
  }
  // Console is a distinct, metered signing-ops product layered on top of
  // every plan (2026-07-30, direct instruction) — NOT the same thing as
  // Business's existing unmetered `apiAccess` perk on the plain
  // /api/v1/documents endpoint, which is untouched by this. "Pro plan or
  // higher" is only the access gate here; usage through console itself is
  // always billed, Business included.
  const metered = true;

  const rateOk = await checkRateLimit(`console-chat:${orgId}`, 60, 3600);
  if (!rateOk) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await runConsoleChatTurn({
      orgId,
      metered,
      messages: parsed.data.messages,
      confirmedTool: parsed.data.confirmedTool,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Console chat turn failed", err);
    // Surface the real (truncated) error text instead of a generic
    // message — this was previously opaque ("hit an error, try again")
    // with no way to tell a Mistral rate-limit/timeout apart from a real
    // bug without pulling Vercel logs. Still logged in full above.
    const detail = err instanceof Error ? err.message.slice(0, 200) : "Unknown error";
    return NextResponse.json(
      { type: "error", error: `The console assistant hit an error: ${detail}` },
      { status: 500 }
    );
  }
}
