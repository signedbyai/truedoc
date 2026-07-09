import { NextResponse } from "next/server";
import { getFromR2 } from "@/lib/r2";
import { getSignerByToken } from "@/lib/signing";

// Same PDF proxy as the org-facing route, but access is scoped by knowledge
// of the signing token instead of an org-membership RLS check.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, document } = result;

  const { data: doc } = await admin.from("documents").select("file_path").eq("id", document.id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { body, contentType } = await getFromR2(doc.file_path);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
