import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractQuoteLineItems } from "@/lib/quote-document";
import { normalizeAIProvider } from "@/lib/ai-provider";
import { planHasFeature } from "@/lib/plan";

const bodySchema = z.object({
  description: z.string(),
});

// Stateless: generates starting line items from a plain-language job
// description and returns them, writes nothing to the database. Same
// pattern as POST /api/documents/draft — the sender reviews/edits the line
// items client-side (MagicQuoteForm's editable table) and nothing becomes a
// real document until POST /api/quotes/finalize.
//
// Deliberately NOT gated by planHasFeature — Magic Quote is free on every
// plan (2026-07-21, direct instruction), unlike AI-drafted documents.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, ai_provider, ai_test_org")
    .eq("id", orgId)
    .single();

  const ok = await checkRateLimit(`quote-draft:${orgId}`, 20, 600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Describe the job before generating a quote." }, { status: 400 });
  }

  const result = await extractQuoteLineItems(
    parsed.data.description,
    normalizeAIProvider(org?.ai_provider, org?.ai_test_org ?? false, planHasFeature(org?.plan, "aiAnthropicProvider"))
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
