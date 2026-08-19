import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { UseTemplateButton } from "@/components/use-template-button";
import { DeleteTemplateButton } from "@/components/delete-template-button";
import { BulkSendButton } from "@/components/bulk-send-button";
import { CopyIdChip } from "@/components/copy-id-chip";

// Free orgs used to get a full paywall here instead of this page (blocked
// by planHasFeature(..., "templates")) — but Free is now allowed to save 1
// template of its own (FREE_TIER_ONE_TEMPLATE_SCOPE.md, 2026-08-19), so the
// page needs to actually show it instead of turning Free away at the door.
// `hasTemplates` below still means "unlimited" (Pro+); Free's capped-at-1
// case is handled inline further down. (The shared seeded "Example
// Agreement" every org used to also get was removed the same day, once
// Free could save its own template made it redundant — see
// checkFreePlanTemplateCap's doc comment in plan.ts.)
export default async function TemplatesPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { data: org } = await ctx.supabase.from("organizations").select("plan").eq("id", ctx.orgId).single();
  const hasBulkSend = planHasFeature(org?.plan, "bulkSend");
  const hasTemplates = planHasFeature(org?.plan, "templates");
  const hasApiAccess = planHasFeature(org?.plan, "apiAccess") || planHasFeature(org?.plan, "consoleAccess");

  const { data: templates } = await ctx.supabase
    .from("templates")
    .select("id, name, page_count, field_map, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  // Every row here is something the org saved itself (no more shared
  // seeded example to exclude, see the top-of-file comment) — same count
  // checkFreePlanTemplateCap enforces server-side, recomputed here purely
  // for display so the "N of 1 used" messaging can never drift from what
  // actually blocks a save.
  const ownTemplateCount = (templates || []).length;

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-600">
            Reusable field layouts. Open any draft document and use &quot;Save as template&quot; to create one.
          </p>
          {/* Matches the Team page's "Invite your team" upgrade card exactly
              (same border/padding/centering, same button component) —
              2026-08-19 direct ask to make the two upgrade prompts visually
              consistent instead of this one being a lighter inline text
              link. The usage count is the headline in place of a "you're
              blocked" message, since Free has partial access here (not a
              hard wall like Team) — see the mockup discussion for why this
              reads as "raise Templates to Team's weight" rather than the
              other direction. */}
          {!hasTemplates && (
            <div className="mt-3 rounded-md border border-dashed border-slate-300 p-4 text-center">
              <p className="text-sm font-medium text-slate-900">
                {Math.min(ownTemplateCount, 1)} of 1 saved template used
              </p>
              <p className="mt-1 text-xs text-slate-500">Upgrade to Pro for unlimited templates &amp; reminders.</p>
              <Link href="/pricing" className={buttonVariants({ size: "default", className: "mt-3" })}>
                Upgrade to Pro
              </Link>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your templates</CardTitle>
            <CardDescription>Field positions and recipient roles are saved — pick real recipients each time you use one.</CardDescription>
          </CardHeader>
          <CardContent>
            {templates && templates.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <li key={t.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.page_count} page{t.page_count === 1 ? "" : "s"} ·{" "}
                        {Array.isArray(t.field_map) ? t.field_map.length : 0} field
                        {Array.isArray(t.field_map) && t.field_map.length === 1 ? "" : "s"} ·{" "}
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                      {hasApiAccess && (
                        <div className="mt-1.5">
                          <CopyIdChip value={t.id} label="Copy template ID" />
                        </div>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <DeleteTemplateButton templateId={t.id} />
                        {hasBulkSend ? (
                          <BulkSendButton templateId={t.id} />
                        ) : (
                          <Link href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
                            Bulk send (Team+)
                          </Link>
                        )}
                      </div>
                    </div>
                    <UseTemplateButton templateId={t.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No templates yet. Open a draft document with fields placed, then click &quot;Save as template&quot;.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
