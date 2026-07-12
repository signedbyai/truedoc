import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { NewDocumentClient } from "@/components/new-document-client";

export default async function NewDocumentPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");

  const { data: org } = await ctx.supabase.from("organizations").select("plan").eq("id", ctx.orgId).single();
  const hasAiDraft = planHasFeature(org?.plan, "aiDraft");

  return <NewDocumentClient hasAiDraft={hasAiDraft} />;
}
