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
  const metered = !hasApiAccess;

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
    return NextResponse.json({ type: "error", error: "The console assistant hit an error. Try again." }, { status: 500 });
  }
}
