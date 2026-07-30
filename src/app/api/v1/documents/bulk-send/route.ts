import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { planHasFeature } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { bulkSendAction } from "@/lib/console-actions";

// POST /api/v1/documents/bulk-send — API-key-authenticated equivalent of
// the existing session-only dashboard bulk-send
// (/api/templates/[id]/bulk-send). CONSOLE_UX_SCOPE.md #1: exposes the same
// already-shipped bulkSend feature (Team+, same gate, no new pricing
// decision) to external agents and the console chat's `bulk_send` tool,
// neither of which have a browser session to authenticate with.
const bodySchema = z.object({
  template_id: z.string().uuid(),
  recipients: z
    .array(
      z.object({
        email: z.string().trim().toLowerCase().email(),
        name: z.string().trim().max(200).optional().nullable(),
      })
    )
    .min(1)
    .max(200),
});

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { orgId, metered } = auth;

  const rateOk = await checkRateLimit(`api-v1-bulk-send:${orgId}`, 60, 3600);
  if (!rateOk) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "bulkSend")) {
    return NextResponse.json({ error: "Bulk send requires the Team plan or higher.", upgrade: true }, { status: 402 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body." }, { status: 400 });
  }

  const result = await bulkSendAction({
    orgId,
    templateId: parsed.data.template_id,
    recipients: parsed.data.recipients,
    metered,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(
    {
      sent: result.sent.length,
      documents: result.sent,
      ...(result.skippedCapReached.length > 0
        ? { skipped_cap_reached: result.skippedCapReached, note: "Console spend cap reached partway through this batch." }
        : {}),
    },
    { status: 201 }
  );
}
