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
    .select("id, title, status, created_at, updated_at, org_id, expires_at")
    .eq("id", id)
    .single();

  if (!doc || doc.org_id !== auth.orgId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: signers } = await admin
    .from("signers")
    .select("email, name, status, signed_at, auth_required, auth_verified_at")
    .eq("document_id", id)
    .order("order_index", { ascending: true });

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    expires_at: doc.expires_at,
    // auth_verified exposed as a boolean, not the raw timestamp — an API
    // caller (e.g. a Make scenario) needs "did they verify," not the exact
    // moment, and this matches auth_required's own boolean shape rather than
    // mixing a bool with a nullable datetime for the same concept.
    signers: (signers || []).map((s) => ({
      email: s.email,
      name: s.name,
      status: s.status,
      signed_at: s.signed_at,
      auth_required: s.auth_required,
      auth_verified: Boolean(s.auth_verified_at),
    })),
  });
}
