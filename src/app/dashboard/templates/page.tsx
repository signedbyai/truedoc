import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UseTemplateButton } from "@/components/use-template-button";
import { DeleteTemplateButton } from "@/components/delete-template-button";

export default async function TemplatesPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");

  const { data: templates } = await ctx.supabase
    .from("templates")
    .select("id, name, page_count, field_map, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-600">
            Reusable field layouts. Open any draft document and use &quot;Save as template&quot; to create one.
          </p>
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
                  <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.page_count} page{t.page_count === 1 ? "" : "s"} ·{" "}
                        {Array.isArray(t.field_map) ? t.field_map.length : 0} field
                        {Array.isArray(t.field_map) && t.field_map.length === 1 ? "" : "s"} ·{" "}
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                      <div className="mt-1">
                        <DeleteTemplateButton templateId={t.id} />
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
