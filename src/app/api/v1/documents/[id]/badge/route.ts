import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { appUrl } from "@/lib/email";
import { generateVerifiedBadgeImage } from "@/lib/badge-asset";

// GET /api/v1/documents/[id]/badge — API-key-gated download of the
// standalone Badge image (VERIFIED_BADGE_SCOPE.md deliverable #2). The
// seal_document MCP tool returns this route's URL directly rather than
// embedding the image inline, so an agent (or the human it's acting for)
// can fetch it separately without bloating every tool response.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .select("org_id, title, is_verified_badge")
    .eq("id", id)
    .single();
  if (error || !doc || doc.org_id !== auth.orgId || !doc.is_verified_badge) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: completedEvent } = await admin
    .from("audit_events")
    .select("document_hash")
    .eq("document_id", id)
    .eq("event_type", "completed")
    .maybeSingle();
  if (!completedEvent?.document_hash) {
    return NextResponse.json({ error: "This document hasn't been sealed yet." }, { status: 404 });
  }

  try {
    const verifyUrl = `${appUrl()}/verify?hash=${completedEvent.document_hash}`;
    const png = await generateVerifiedBadgeImage(verifyUrl);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}-verified-badge.png"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("API v1: badge image generation failed", err);
    return NextResponse.json({ error: "Could not generate badge image" }, { status: 500 });
  }
}
