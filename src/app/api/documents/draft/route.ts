import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { draftDocument } from "@/lib/draft-document";
import { planHasFeature } from "@/lib/plan";
import { normalizeAIProvider } from "@/lib/ai-provider";
import { selfDisplayName } from "@/lib/frequent-signers";

const bodySchema = z.object({
  documentType: z.string(),
  description: z.string(),
  // Optional — draftDocument() itself falls back to English for a missing
  // or unsupported code (see its isSupportedDraftLang check), so there's no
  // need to duplicate that validation here.
  language: z.string().optional(),
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
  const { supabase, orgId, user } = ctx;

  // Gated at generation, not just finalize — this call itself is the cost
  // (Sonnet, not Haiku), so a Free org must not be able to generate drafts
  // it can never save. See plan.ts's aiDraft comment.
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, ai_provider, ai_test_org")
    .eq("id", orgId)
    .single();
  if (!planHasFeature(org?.plan, "aiDraft")) {
    return NextResponse.json(
      { error: "AI-drafted documents are a Starter plan feature. Upgrade to describe and draft documents.", upgrade: true },
      { status: 402 }
    );
  }

  const ok = await checkRateLimit(`draft:${orgId}`, 20, 600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please accept the disclaimer and describe what you need." }, { status: 400 });
  }

  // Silent "Prepared by" (2026-07-23) — always the signed-in user's own name,
  // no picker/UI for this. Lets the draft name the preparing party directly
  // instead of leaving a bracket placeholder for it. See draft-document.ts.
  const result = await draftDocument(
    parsed.data.documentType,
    parsed.data.description,
    normalizeAIProvider(org?.ai_provider, org?.ai_test_org ?? false),
    parsed.data.language,
    selfDisplayName(user)
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
