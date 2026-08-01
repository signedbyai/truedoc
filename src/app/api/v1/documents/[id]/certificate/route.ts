import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getFromR2 } from "@/lib/r2";

// GET /api/v1/documents/[id]/certificate — API-key-gated download of the
// standalone certificate PDF (Verified Badge's separate/both certificateMode).
// Mirrors /api/v1/documents/[id]/signed-file's auth shape exactly.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .select("org_id, title, certificate_file_path")
    .eq("id", id)
    .single();

  if (error || !doc || doc.org_id !== auth.orgId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!doc.certificate_file_path) {
    return NextResponse.json({ error: "No standalone certificate for this document." }, { status: 404 });
  }

  try {
    const { body, contentType } = await getFromR2(doc.certificate_file_path);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}-certificate.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("API v1: certificate R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
