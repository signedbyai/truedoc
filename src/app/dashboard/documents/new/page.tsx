import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { getRequestCurrency } from "@/lib/currency.server";
import { quoteCurrencyForAppCurrency } from "@/lib/quote-types";
import { DOCUMENT_TYPES, type DraftDocumentType } from "@/lib/ai-draft-types";
import { NewDocumentClient } from "@/components/new-document-client";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; mode?: string }>;
}) {
  const { type, mode } = await searchParams;

  const ctx = await getUserAndOrg();
  if (!ctx) {
    // Preserves ?type=/?mode= across the sign-in detour, e.g. someone who
    // clicked "Use this template" from /templates/nda, or "Try Magic Quote"
    // from /magic-quote, while logged out but landed here directly (those
    // pages themselves link to /login?next=... for that case — this is
    // defense in depth for any other path that reaches this URL
    // unauthenticated).
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (mode) params.set("mode", mode);
    const query = params.toString();
    const next = `/dashboard/documents/new${query ? `?${query}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: org } = await ctx.supabase.from("organizations").select("plan").eq("id", ctx.orgId).single();
  const hasAiDraft = planHasFeature(org?.plan, "aiDraft");

  // Same geo/cookie-based signal the pricing and checkout pages already use
  // (see currency.server.ts) — a materially better default for Magic
  // Quote's currency picker than guessing from the browser's language.
  const requestCurrency = await getRequestCurrency();
  const defaultQuoteCurrency = quoteCurrencyForAppCurrency(requestCurrency);

  // A /templates/[slug] landing page links here with ?type=nda so the AI
  // Drafter opens with that template already selected. Validated against
  // the real DOCUMENT_TYPES list rather than cast directly — it's a
  // visitor-editable query param.
  const initialDocumentType = DOCUMENT_TYPES.some((t) => t.id === type) ? (type as DraftDocumentType) : undefined;
  const initialMode = mode === "quote" ? "quote" : mode === "draft" ? "draft" : undefined;

  return (
    <NewDocumentClient
      hasAiDraft={hasAiDraft}
      defaultQuoteCurrency={defaultQuoteCurrency}
      initialDocumentType={initialDocumentType}
      initialMode={initialMode}
    />
  );
}
