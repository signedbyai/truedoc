import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/email";
import { generateVerifiedBadgeImage } from "@/lib/badge-asset";

// Streams the standalone "Badge" image (VERIFIED_BADGE_SCOPE.md deliverable
// #2) — generated on the fly from the document's own completed-audit-event
// hash rather than stored in R2, since it's cheap to regenerate and this
// avoids a second write on every seal. Same RLS-backed session access
// pattern as the signed-file/certificate proxy routes.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("title, is_verified_badge")
    .eq("id", id)
    .single();
  if (error || !doc || !doc.is_verified_badge) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: completedEvent } = await supabase
    .from("audit_events")
    .select("document_hash, timestamp_tsa")
    .eq("document_id", id)
    .eq("event_type", "completed")
    .maybeSingle();
  if (!completedEvent?.document_hash) {
    return NextResponse.json({ error: "This document hasn't been sealed yet." }, { status: 404 });
  }

  try {
    const verifyUrl = `${appUrl()}/verify?hash=${completedEvent.document_hash}`;
    const png = await generateVerifiedBadgeImage(verifyUrl, Boolean(completedEvent.timestamp_tsa));
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}-verified-badge.png"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("Badge image generation failed", err);
    return NextResponse.json({ error: "Could not generate badge image" }, { status: 500 });
  }
}
