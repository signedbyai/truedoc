import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { getRequestCurrency } from "@/lib/currency.server";
import { quoteCurrencyForAppCurrency } from "@/lib/quote-types";
import { NewDocumentClient } from "@/components/new-document-client";

export default async function NewDocumentPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");

  const { data: org } = await ctx.supabase.from("organizations").select("plan").eq("id", ctx.orgId).single();
  const hasAiDraft = planHasFeature(org?.plan, "aiDraft");

  // Same geo/cookie-based signal the pricing and checkout pages already use
  // (see currency.server.ts) — a materially better default for Magic
  // Quote's currency picker than guessing from the browser's language.
  const requestCurrency = await getRequestCurrency();
  const defaultQuoteCurrency = quoteCurrencyForAppCurrency(requestCurrency);

  return <NewDocumentClient hasAiDraft={hasAiDraft} defaultQuoteCurrency={defaultQuoteCurrency} />;
}
