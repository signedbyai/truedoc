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

  // Best-effort — the row is already gone either way, and deleteFromR2
  // swallows its own errors rather than throwing.
  if (doc.file_path) await deleteFromR2(doc.file_path);

  return NextResponse.json({ success: true });
}
