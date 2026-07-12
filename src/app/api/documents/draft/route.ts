import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { draftDocument } from "@/lib/draft-document";

const bodySchema = z.object({
  documentType: z.string(),
  description: z.string(),
  // Required so the disclaimer can't be silently skipped by calling the API
  // directly — the client also gates the "Generate draft" button on this,
  // see AI_DRAFT_DISCLAIMER/AI_DRAFT_CHECKBOX_LABEL in ai-draft-types.ts.
  disclaimerAccepted: z.literal(true),
});

// Stateless: generates a draft and returns it, writes nothing to the
// database. Same pattern as suggest-fields.ts — the sender reviews/edits
// this text client-side, and nothing becomes a real document until they
// explicitly finalize it (POST /api/documents/draft/finalize).
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const ok = await checkRateLimit(`draft:${orgId}`, 20, 600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please accept the disclaimer and describe what you need." }, { status: 400 });
  }

  const result = await draftDocument(parsed.data.documentType, parsed.data.description);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
