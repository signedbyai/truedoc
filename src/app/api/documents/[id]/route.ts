import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { deleteFromR2 } from "@/lib/r2";

// Deletes a document — draft only. A draft was never sent, so there's no
// signer commitment or completed audit trail worth protecting; anything
// past draft (sent/declined/voided/completed) already has real history and
// is left alone (void already exists for "sent" if a sender needs to back
// out of an in-flight request). signers/document_fields/audit_events all
// cascade off documents.id, so this is a single delete, not a fan-out.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: doc } = await supabase
    .from("documents")
    .select("id, org_id, status, file_path")
    .eq("id", id)
    .single();

  if (!doc || doc.org_id !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be deleted." }, { status: 400 });
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) {
    console.error("Document delete failed", error);
    return NextResponse.json({ error: "Couldn't delete this document." }, { status: 500 });
  }

  // 2026-08-02 fix: only purge the R2 object if nothing else still points
  // at it. "Use template", console's send_document, and bulk-send all seed
  // a document's file_path straight from templates.base_file_path rather
  // than copying it (see templates/[id]/use/route.ts) — deliberately, per
  // save-as-template/route.ts's own doc comment ("the original upload is
  // never mutated"). copyInR2() exists in lib/r2.ts specifically so
  // "Duplicate document" gets its own independent key instead of sharing
  // one for this exact reason, but the template-instantiation paths never
  // adopted that pattern — so this document's file_path may still be the
  // template's own PDF, or shared with sibling documents created from the
  // same template. Deleting it out from under them would silently 404 the
  // template (and every sibling) with no error surfaced anywhere. Query
  // runs AFTER the row delete above, so it only sees remaining references.
  if (doc.file_path) {
    const [{ count: docCount }, { count: templateCount }] = await Promise.all([
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("file_path", doc.file_path),
      supabase.from("templates").select("id", { count: "exact", head: true }).eq("base_file_path", doc.file_path),
    ]);
    // Best-effort — deleteFromR2 swallows its own errors rather than throwing.
    if (!docCount && !templateCount) await deleteFromR2(doc.file_path);
  }

  return NextResponse.json({ success: true });
}
