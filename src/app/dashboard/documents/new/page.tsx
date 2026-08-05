import { redirect } from "next/navigation";
import { FlagValues } from "flags/react";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature, getFreePlanUsage } from "@/lib/plan";
import { getRequestCurrency } from "@/lib/currency.server";
import { quoteCurrencyForAppCurrency } from "@/lib/quote-types";
import { DOCUMENT_TYPES, type DraftDocumentType } from "@/lib/ai-draft-types";
import { uploadContinueButtonColorFlag } from "@/flags";
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

  // Read-only "would the next send actually be blocked?" check (2026-08-05,
  // direct ask) — real enforcement lives in checkFreePlanSendCap at the
  // actual /send call, but a Free org that's already used its 3 sends AND
  // has no doc_credits left to fall back on should see the Upgrade card the
  // moment they try to upload a 4th, not only after placing fields and
  // clicking Send. Credits checked here too — a Free org sitting on a
  // referral credit isn't actually capped yet. See NewDocumentClient's
  // sendCapReached prop doc for the staleness tradeoff this accepts.
  let sendCapReached = false;
  if ((org?.plan ?? "free") === "free") {
    const usage = await getFreePlanUsage(ctx.supabase, ctx.orgId);
    sendCapReached = usage.sendsUsedThisMonth >= 3 && usage.docCredits <= 0;
  }

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

  // "Upload & continue" button color test (2026-08-05, direct ask) —
  // resolved unconditionally, cheap and independent of hasAiDraft/mode
  // since the Upload tab (and its button) is reachable regardless of which
  // tab initially renders.
  const uploadButtonColorVariant = await uploadContinueButtonColorFlag();

  return (
    <>
      <FlagValues values={{ "upload-continue-button-color": uploadButtonColorVariant }} />
      <NewDocumentClient
        hasAiDraft={hasAiDraft}
        defaultQuoteCurrency={defaultQuoteCurrency}
        initialDocumentType={initialDocumentType}
        initialMode={initialMode}
        currency={requestCurrency}
        uploadButtonColorVariant={uploadButtonColorVariant}
        sendCapReached={sendCapReached}
      />
    </>
  );
}
