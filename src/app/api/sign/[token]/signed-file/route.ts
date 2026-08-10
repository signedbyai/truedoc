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
    const { body } = await getFromR2(doc.signed_file_path);
    return new NextResponse(body, {
      headers: {
        // application/octet-stream, not the real PDF content type -- same
        // fix as the dashboard-side signed-file/certificate/original-file/
        // badge-on routes (67d4ddb) and for the same reason: Safari
        // overrides download/attachment disposition for anything it
        // recognizes as application/pdf. signing-view.tsx's own
        // handleShareOrDownloadSignedPdf already fetches this as a blob and
        // hands it to navigator.share() client-side (which was never
        // subject to this bug -- fetch() doesn't trigger Safari's viewer
        // override, only a top-level navigation does), but that function's
        // own last-resort fallback (`window.location.href = url`, used only
        // if the fetch itself throws) DOES navigate here directly -- this
        // keeps that rare fallback path safe too, for consistency with
        // every other file-download route in the app.
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
