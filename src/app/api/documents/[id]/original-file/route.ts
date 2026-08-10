import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFromR2 } from "@/lib/r2";

// Downloads the original/source PDF as uploaded, regardless of document
// status. Previously only reachable pre-send (via the draft-editor's inline
// file/route.ts, which has no download disposition) or, after full
// completion, indirectly via the signed PDF (which has the certificate page
// appended — not the original). This is the dedicated "give me back exactly
// what I uploaded" download, same RLS-backed access pattern as the other
// file routes.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("title, file_path")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { body } = await getFromR2(doc.file_path);
    return new NextResponse(body, {
      headers: {
        // application/octet-stream, not the real PDF content type — see
        // badge-on/route.ts's comment for why (Safari overrides download/
        // attachment disposition for anything it recognizes as a PDF).
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
