import { NextResponse } from "next/server";
import { generateCertificateBadge } from "@/lib/badge-asset";
import { appUrl } from "@/lib/email";
import { isValidDocumentHash } from "@/app/api/verify/hash";

// Shared certificate/verify QR — CERTIFICATE_VISIBILITY_PROMOTION_SCOPE.md
// (2026-08-04): the same small mark+QR image already baked into every
// signed document's Certificate of Completion page (generate-signed-pdf.ts),
// now also renderable live so it can be promoted on the signer's own
// confirmation screen and the dashboard document page — the two places
// people actually see right after signing, instead of only inside a PDF
// they may never fully open.
//
// Deliberately takes just a `hash`, not a document id or an arbitrary
// target URL — same public-key model the /verify page itself already uses
// (isValidDocumentHash gate, same as api/verify/route.ts). No ownership or
// session check needed: knowing a document's hash already lets anyone look
// it up at /verify, so this can't leak anything the hash didn't already
// expose, and building the verifyUrl server-side from a validated hash
// (rather than accepting a raw url param) rules out this becoming an
// open "generate a QR for any URL" endpoint.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash") || "";
  if (!isValidDocumentHash(hash)) {
    return NextResponse.json({ error: "Invalid hash" }, { status: 400 });
  }

  try {
    const verifyUrl = `${appUrl()}/verify?hash=${hash}`;
    const png = await generateCertificateBadge(verifyUrl);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Content is fully determined by the hash in the query string, so
        // this is safe to cache aggressively at the edge/browser.
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("Certificate QR generation failed", err);
    return NextResponse.json({ error: "Could not generate QR" }, { status: 500 });
  }
}
