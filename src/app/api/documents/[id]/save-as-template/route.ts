import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";

const bodySchema = z.object({ name: z.string().trim().min(1).max(200) });

// Saves the current field layout as a reusable template. Fields are stored
// with a generic 0-based "role" (recipient slot) instead of a real signer_id
// — role 0 is whichever signer was added first in this document, role 1 the
// second, and so on — so the template can be reused with any set of
// recipients later. The source PDF itself is reused (base_file_path points
// at the same R2 object) rather than copied, since the original upload is
// never mutated after creation.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Give the template a name." }, { status: 400 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, org_id, file_path, page_count")
    .eq("id", id)
    .single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: signers } = await supabase
    .from("signers")
    .select("id, order_index")
    .eq("document_id", id)
    .order("order_index", { ascending: true });

  const roleBySignerId = new Map<string, number>();
  (signers || []).forEach((s, i) => roleBySignerId.set(s.id, i));

  const { data: fields } = await supabase
    .from("document_fields")
    .select("type, page, x, y, width, height, required, signer_id")
    .eq("document_id", id)
    .order("created_at", { ascending: true });

  if (!fields || fields.length === 0) {
    return NextResponse.json({ error: "Place at least one field before saving as a template." }, { status: 400 });
  }

  const fieldMap = fields.map((f) => ({
    type: f.type,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    required: f.required,
    role: f.signer_id ? roleBySignerId.get(f.signer_id) ?? null : null,
  }));

  const { data: template, error } = await supabase
    .from("templates")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      base_file_path: doc.file_path,
      page_count: doc.page_count,
      field_map: fieldMap,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Save as template failed", error);
    return NextResponse.json({ error: "Couldn't save as a template." }, { status: 500 });
  }

  return NextResponse.json({ id: template.id });
}
