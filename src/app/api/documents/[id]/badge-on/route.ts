import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFromR2 } from "@/lib/r2";

// Streams the "Badge-on sealed PDF" — the corner-stamped copy of the
// original document (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.4), the
// new primary output once it exists. Same RLS-backed access pattern as
// signed-file/certificate.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("title, badge_stamped_file_path")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!doc.badge_stamped_file_path) {
    return NextResponse.json({ error: "Badge-on PDF isn't ready yet." }, { status: 404 });
  }

  try {
    const { body } = await getFromR2(doc.badge_stamped_file_path);
    return new NextResponse(body, {
      headers: {
        // application/octet-stream, not the real PDF content type — FIXED
        // 2026-08-10 (second report, same screenshot bug persisting after
        // the download-attribute fix). Safari's known behavior: it
        // overrides `download`/Content-Disposition:attachment and renders
        // its own inline PDF viewer whenever it recognizes the response as
        // application/pdf, no matter what the link says — there's no
        // reliable client-side-only way around that. Serving as a generic
        // binary type instead removes Safari's reason to intercept it, so
        // it falls through to an actual save/download rather than an
        // in-page preview (which is what was exposing the raw API URL to
        // the share sheet). The .pdf filename in Content-Disposition still
        // makes the saved file open correctly afterward.
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}-badge-on.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
