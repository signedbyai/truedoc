import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { UseTemplateButton } from "@/components/use-template-button";
import { DeleteTemplateButton } from "@/components/delete-template-button";
import { BulkSendButton } from "@/components/bulk-send-button";
import { OrgSwitcher } from "@/components/org-switcher";
import { LogoutLink } from "@/components/logout-link";

export default async function TemplatesPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { orgs, orgId } = ctx;

  const { data: org } = await ctx.supabase.from("organizations").select("plan").eq("id", ctx.orgId).single();
  const hasBulkSend = planHasFeature(org?.plan, "bulkSend");
  const hasTemplates = planHasFeature(org?.plan, "templates");

  if (!hasTemplates) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
                ← Dashboard
              </Link>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Templates</h1>
            </div>
            <div className="flex items-center gap-3">
              <OrgSwitcher orgs={orgs} activeOrgId={orgId} />
              <LogoutLink />
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Save reusable field layouts and reuse them across documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
                <p className="text-sm font-medium text-slate-900">Templates &amp; reminders</p>
                <p className="mt-1 text-xs text-slate-500">
                  Saving templates and sending reminders is available on the Starter plan and up.
                </p>
                <Link href="/pricing" className={buttonVariants({ size: "default", className: "mt-3" })}>
                  Upgrade to Starter
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const { data: templates } = await ctx.supabase
    .from("templates")
    .select("id, name, page_count, field_map, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Templates</h1>
            <p className="text-sm text-slate-600">
              Reusable field layouts. Open any draft document and use &quot;Save as template&quot; to create one.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrgSwitcher orgs={orgs} activeOrgId={orgId} />
            <LogoutLink />
          </div>
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
                      <div className="mt-1 flex flex-wrap items-center gap-3">
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
