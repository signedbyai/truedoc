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
    const { body, contentType } = await getFromR2(doc.badge_stamped_file_path);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}-badge-on.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
