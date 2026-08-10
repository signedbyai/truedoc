import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature, getFreePlanUsage } from "@/lib/plan";
import { getRequestCurrency } from "@/lib/currency.server";
import { quoteCurrencyForAppCurrency } from "@/lib/quote-types";
import { DOCUMENT_TYPES, type DraftDocumentType } from "@/lib/ai-draft-types";
import { NewDocumentClient } from "@/components/new-document-client";
import { fallbackBadgeRect, type BadgeRect } from "@/lib/badge-resize";

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

  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("plan, badge_placement_mode, last_badge_page, last_badge_x, last_badge_y, last_badge_width")
    .eq("id", ctx.orgId)
    .single();
  const hasAiDraft = planHasFeature(org?.plan, "aiDraft");
  // Badge Placer (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.1) — resolved
  // server-side once here rather than re-derived client-side, same
  // starting-position logic sealDocumentAction itself falls back to.
  const hasPaymentCollection = planHasFeature(org?.plan, "paymentCollection");
  const orgBadgePlacementMode = org?.badge_placement_mode === "ask" ? "ask" : "skip";
  const initialBadgeRect: BadgeRect =
    org?.last_badge_page != null && org?.last_badge_x != null && org?.last_badge_y != null && org?.last_badge_width != null
      ? { page: org.last_badge_page, x: org.last_badge_x, y: org.last_badge_y, width: org.last_badge_width }
      : fallbackBadgeRect();

  // Read-only "would the next send actually be blocked?" check (2026-08-05,
  // direct ask) — real enforcement lives in checkFreePlanSendCap at the
  // actual /send call, but a Free org that's already used its 3 sends AND
  // has no doc_credits left to fall back on should see the Upgrade card the
  // moment they try to upload a 4th, not only after placing fields and
  // clicking Send. Credits checked here too — a Free org sitting on a
  // referral credit isn't actually capped yet. See NewDocumentClient's
  // sendCapReached prop doc for the staleness tradeoff this accepts.
  // Same read-only courtesy pre-check as sendCapReached, for Verified
  // Badge's own independent 3-seals/month pool (2026-08-05,
  // VERIFIED_BADGE_DASHBOARD_SCOPE.md) — real enforcement lives in
  // checkFreePlanSealCap inside sealDocumentAction at the actual
  // POST /api/documents/[id]/seal call. One getFreePlanUsage call covers
  // both checks since it already returns both counts together.
  let sendCapReached = false;
  let sealCapReached = false;
  if ((org?.plan ?? "free") === "free") {
    const usage = await getFreePlanUsage(ctx.supabase, ctx.orgId);
    sendCapReached = usage.sendsUsedThisMonth >= 3 && usage.docCredits <= 0;
    sealCapReached = usage.sealsUsedThisMonth >= 3 && usage.docCredits <= 0;
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
  const initialMode = mode === "quote" ? "quote" : mode === "draft" ? "draft" : mode === "badge" ? "badge" : undefined;

  return (
    <NewDocumentClient
      hasAiDraft={hasAiDraft}
      defaultQuoteCurrency={defaultQuoteCurrency}
      initialDocumentType={initialDocumentType}
      initialMode={initialMode}
      currency={requestCurrency}
      sendCapReached={sendCapReached}
      sealCapReached={sealCapReached}
      orgBadgePlacementMode={orgBadgePlacementMode}
      hasPaymentCollection={hasPaymentCollection}
      initialBadgeRect={initialBadgeRect}
    />
  );
}
