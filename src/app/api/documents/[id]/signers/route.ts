import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signerSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email(),
  order_index: z.number().int().min(0).default(0),
});

const bodySchema = z.object({ signers: z.array(signerSchema).min(1) });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("signers")
    .select("id, name, email, order_index, status, signed_at")
    .eq("document_id", id)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signers: data });
}

// Replace-all, same pattern as the fields route: recipients are edited as a
// whole list, not one at a time, and volumes are tiny (a handful of signers
// per document).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signer data" }, { status: 400 });
  }

  // Don't let a document already sent/completed have its recipient list
  // silently rewritten out from under in-flight signatures.
  const { data: doc } = await supabase.from("documents").select("status").eq("id", id).single();
  if (doc && doc.status !== "draft") {
    return NextResponse.json(
      { error: "Recipients can only be edited while the document is still a draft" },
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase.from("signers").delete().eq("document_id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = parsed.data.signers.map((s) => ({
    document_id: id,
    name: s.name || null,
    email: s.email,
    order_index: s.order_index,
  }));

  const { data, error: insertError } = await supabase.from("signers").insert(rows).select("id, name, email, order_index");
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ signers: data });
}
