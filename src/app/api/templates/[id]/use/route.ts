import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";

const bodySchema = z.object({ title: z.string().trim().max(200).optional() });

type TemplateFieldMapEntry = {
  type: "signature" | "initials" | "date" | "text" | "checkbox";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  role: number | null;
};

// Creates a new draft document seeded from a template's field layout. Fields
// come in with signer_id null and template_role set to the saved role
// number — the FieldEditor binds them to real signer_id values as recipients
// are added, in the same order the template's roles were recorded.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data: template } = await supabase
    .from("templates")
    .select(
      "id, org_id, name, base_file_path, page_count, field_map, payment_link_url, payment_label, docgate_url, docgate_label"
    )
    .eq("id", id)
    .single();
  if (!template || template.org_id !== orgId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // No plan gate here (2026-08-19, FREE_TIER_ONE_TEMPLATE_SCOPE.md) — using
  // a template you already own (whether it's the seeded shared example or
  // Free's own 1 self-saved template) works on every plan now. The gate
  // that matters lives at the two SAVE points instead (save-as-template/
  // route.ts and console-actions.ts's saveAsTemplateAction), where
  // checkFreePlanTemplateCap enforces Free's 1-template limit.
  const documentId = crypto.randomUUID();
  const title = parsed.data.title || template.name;

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      org_id: orgId,
      owner_id: user.id,
      title,
      status: "draft",
      file_path: template.base_file_path,
      original_filename: `${title}.pdf`,
      page_count: template.page_count,
      payment_link_url: template.payment_link_url,
      payment_label: template.payment_label,
      docgate_url: template.docgate_url,
      docgate_label: template.docgate_label,
    })
    .select("id")
    .single();

  if (error || !doc) {
    console.error("Create document from template failed", error);
    return NextResponse.json({ error: "Couldn't create a document from this template." }, { status: 500 });
  }

  const fieldMap = (template.field_map as TemplateFieldMapEntry[]) || [];
  if (fieldMap.length > 0) {
    const rows = fieldMap.map((f) => ({
      document_id: doc.id,
      signer_id: null,
      template_role: f.role,
      type: f.type,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      required: f.required,
    }));
    const { error: fieldsError } = await supabase.from("document_fields").insert(rows);
    if (fieldsError) console.error("Insert template fields failed", fieldsError);
  }

  await supabase.from("audit_events").insert({
    document_id: doc.id,
    event_type: "created",
    metadata: { from_template: template.id },
  });

  return NextResponse.json({ id: doc.id });
}
