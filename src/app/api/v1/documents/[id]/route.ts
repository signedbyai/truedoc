import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("id, title, status, created_at, updated_at, org_id")
    .eq("id", id)
    .single();

  if (!doc || doc.org_id !== auth.orgId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: signers } = await admin
    .from("signers")
    .select("email, name, status, signed_at")
    .eq("document_id", id)
    .order("order_index", { ascending: true });

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    signers: signers || [],
  });
}
