import { NextResponse } from "next/server";
import { getSignerByToken } from "@/lib/signing";

// Best-effort tracking only — there's no way to know whether the signer
// actually completed payment on the external site, just that they clicked
// through. Lets the sender at least see "did they click the pay link" in
// the audit trail.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;

  await admin.from("audit_events").insert({
    document_id: document.id,
    signer_id: signer.id,
    event_type: "payment_link_clicked",
    ip_address: request.headers.get("x-forwarded-for"),
    user_agent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true });
}
