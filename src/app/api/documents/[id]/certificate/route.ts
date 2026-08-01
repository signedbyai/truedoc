import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFromR2 } from "@/lib/r2";

// Streams the standalone certificate PDF generated for Verified Badge's
// "separate"/"both" certificateMode (VERIFIED_BADGE_SCOPE.md). Same RLS-
// backed session access pattern as the existing signed-file proxy route —
// see src/app/api/documents/[id]/signed-file/route.ts.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("title, certificate_file_path")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    console.error("R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
