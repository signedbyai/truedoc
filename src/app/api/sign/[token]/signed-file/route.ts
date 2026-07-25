import { NextResponse } from "next/server";
import { getFromR2 } from "@/lib/r2";
import { getSignerByToken, requireVerifiedSigner } from "@/lib/signing";

// Lets a signer download their own copy of the final signed PDF once the
// document is complete, using the same token-scoped access as the other
// signer-facing routes (no Supabase session involved).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;
  const authGate = requireVerifiedSigner(signer);
  if (authGate) return authGate;

  const { data: doc } = await admin
    .from("documents")
    .select("title, signed_file_path")
    .eq("id", document.id)
    .single();

  if (!doc?.signed_file_path) {
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
    console.error("R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
