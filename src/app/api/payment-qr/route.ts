import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePaymentBadge } from "@/lib/badge-asset";
import { isValidDocumentHash } from "@/app/api/verify/hash";

// Payment QR for the /verify page's "Pay this invoice" section
// (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.5) — same public-hash model
// as /api/certificate-qr (see that route's own comment): takes only a
// `hash`, resolves the document's OWN payment_link_url server-side rather
// than accepting an arbitrary target url, so this can't become an open
// "generate a QR for any URL" endpoint. Returns 404 (not an error image)
// when no payment link is set, so the page can simply not render the
// image rather than showing a broken one.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash") || "";
  if (!isValidDocumentHash(hash)) {
    return NextResponse.json({ error: "Invalid hash" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("audit_events")
    .select("document_id")
    .eq("document_hash", hash)
    .eq("event_type", "completed")
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: doc } = await admin.from("documents").select("payment_link_url").eq("id", event.document_id).single();
  if (!doc?.payment_link_url) return NextResponse.json({ error: "No payment link set" }, { status: 404 });

  try {
    const png = await generatePaymentBadge(doc.payment_link_url);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("Payment QR generation failed", err);
    return NextResponse.json({ error: "Could not generate QR" }, { status: 500 });
  }
}
