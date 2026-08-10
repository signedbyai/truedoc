import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFromR2 } from "@/lib/r2";

// Streams the final, stamped + certificate-appended PDF. Same RLS-backed
// access pattern as the source-file proxy route.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("title, signed_file_path, status")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!doc.signed_file_path) {
    return NextResponse.json({ error: "Signed PDF isn't ready yet." }, { status: 404 });
  }

  try {
    const { body } = await getFromR2(doc.signed_file_path);
    return new NextResponse(body, {
      headers: {
        // application/octet-stream, not the real PDF content type — see
        // badge-on/route.ts's comment for why (Safari overrides download/
        // attachment disposition for anything it recognizes as a PDF).
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.title.replace(/[^\w.\- ]/g, "")}-signed.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
