import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getFromR2 } from "@/lib/r2";

// GET /api/v1/documents/[id]/signed-file — download the completed PDF via
// API-key auth. CRM_MCP_READINESS_PHASE1_SCOPE.md Part A#3: the only
// existing signed-file routes are dashboard-session-gated or
// signer-token-gated — neither works from a server-side Make scenario. This
// is the single most valuable gap this phase closes: "when a quote is
// signed, attach the PDF to the CRM deal."
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .select("org_id, title, signed_file_path")
    .eq("id", id)
    .single();

  if (error || !doc || doc.org_id !== auth.orgId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!doc.signed_file_path) {
    return NextResponse.json({ error: "Signed PDF isn't ready yet." }, { status: 404 });
  }

  try {
    const { body, contentType } = await getFromR2(doc.signed_file_path);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}-signed.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("API v1: signed-file R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
