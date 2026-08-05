import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { copyInR2 } from "@/lib/r2";

// Duplicates a document (any status) into a brand-new draft in the same
// org: same PDF (its own independent R2 copy, not a shared key — see
// copyInR2's comment), same field layout, but no signers/recipients and no
// signing history. Modeled closely on
// src/app/api/templates/[id]/use/route.ts ("create document from
// template"), which is structurally the same operation minus the R2 copy
// (templates reuse a base_file_path that's never deleted out from under
// them, which isn't true for an arbitrary source document here).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: source } = await supabase
    .from("documents")
    .select(
      "id, org_id, title, file_path, original_filename, page_count, payment_link_url, payment_label, docgate_url, docgate_label"
    )
    .eq("id", id)
    .single();

  if (!source || source.org_id !== orgId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // No free-plan cap check here as of 2026-08-05 — duplicating just creates
  // another draft; the cap only applies once that draft is actually sent or
  // sealed (checkFreePlanSendCap / checkFreePlanSealCap, see plan.ts).
  const documentId = crypto.randomUUID();
  const destKey = `${orgId}/${documentId}/${source.original_filename}`;

  try {
    await copyInR2(source.file_path, destKey);
  } catch (err) {
    console.error("R2 copy failed", err);
    return NextResponse.json({ error: "Couldn't copy the file. Try again." }, { status: 500 });
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      org_id: orgId,
      owner_id: user.id,
      title: `${source.title} (copy)`,
      status: "draft",
      file_path: destKey,
      original_filename: source.original_filename,
      page_count: source.page_count,
      payment_link_url: source.payment_link_url,
      payment_label: source.payment_label,
      docgate_url: source.docgate_url,
      docgate_label: source.docgate_label,
    })
    .select("id")
    .single();

  if (error || !doc) {
    console.error("Create duplicate document failed", error);
    return NextResponse.json({ error: "Couldn't duplicate this document." }, { status: 500 });
  }

  const { data: sourceFields } = await supabase
    .from("document_fields")
    .select("type, page, x, y, width, height, required")
    .eq("document_id", source.id);

  if (sourceFields && sourceFields.length > 0) {
    const rows = sourceFields.map((f) => ({
      document_id: doc.id,
      signer_id: null,
      template_role: null,
      type: f.type,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      required: f.required,
    }));
    const { error: fieldsError } = await supabase.from("document_fields").insert(rows);
    if (fieldsError) console.error("Insert duplicated fields failed", fieldsError);
  }

  await supabase.from("audit_events").insert({
    document_id: doc.id,
    event_type: "created",
    metadata: { duplicated_from: source.id },
  });

  return NextResponse.json({ id: doc.id });
}
