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
    .select("id, org_id, name, base_file_path, page_count, field_map")
    .eq("id", id)
    .single();
  if (!template || template.org_id !== orgId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Same free-tier monthly document cap as a fresh upload — using a template
  // still creates a document, so it shouldn't be a way around the paywall.
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || org.plan === "free") {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", startOfMonth.toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "You've hit the Free plan's 3 documents/month limit. Upgrade to keep going.", upgrade: true },
        { status: 402 }
      );
    }
  }

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
