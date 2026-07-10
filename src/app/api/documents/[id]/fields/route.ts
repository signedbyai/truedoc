import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const fieldSchema = z.object({
  type: z.enum(["signature", "initials", "date", "text", "checkbox"]),
  page: z.number().int().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  required: z.boolean().default(true),
  signer_id: z.string().uuid().nullable().optional(),
  // Only meaningful while signer_id is null — see field-editor.tsx.
  template_role: z.number().int().nullable().optional(),
});

const bodySchema = z.object({ fields: z.array(fieldSchema) });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_fields")
    .select("id, type, page, x, y, width, height, required, signer_id, template_role")
    .eq("document_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid field data" }, { status: 400 });
  }

  // Replace-all is simplest and safe here: field placement is edited as a
  // whole document, not field-by-field, and volumes are tiny (a few dozen
  // fields per document at most).
  const { error: deleteError } = await supabase
    .from("document_fields")
    .delete()
    .eq("document_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (parsed.data.fields.length > 0) {
    const rows = parsed.data.fields.map((f) => ({ ...f, document_id: id }));
    const { error: insertError } = await supabase.from("document_fields").insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
