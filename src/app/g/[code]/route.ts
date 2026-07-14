import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DocGate redirect (Business tier — see src/lib/plan.ts). Auth model is
// identical to the signing-token pattern in src/lib/signing.ts: knowing the
// unguessable `docgate_code` *is* the credential, no session required.
// Checks the *document's* status, not this signer's own status — that's
// what actually enforces "don't release the asset until everyone has
// signed," per the whole-document-completion decision.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: signer } = await admin
    .from("signers")
    .select("id, document_id, documents(status, docgate_url)")
    .eq("docgate_code", code)
    .single();

  const document = signer?.documents as unknown as { status?: string; docgate_url?: string | null } | undefined;

  if (!signer || document?.status !== "completed" || !document.docgate_url) {
    return NextResponse.redirect(new URL("/g/unavailable", request.url));
  }

  // Best-effort — a logging failure must never block the actual redirect.
  // Deliberately not recording device type or IP-derived location here —
  // same "who clicked, when" shape as payment_link_clicked, nothing more.
  // Vercel's geo headers (x-vercel-ip-country/-country-region/-city) and
  // src/lib/device.ts's classifyDevice() still exist and are cheap to wire
  // back in later if a sender actually asks for that level of detail; no
  // sense collecting and disclosing data nobody's requested yet.
  try {
    await admin.from("audit_events").insert({
      document_id: signer.document_id,
      signer_id: signer.id,
      event_type: "docgate_clicked",
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("docgate_clicked audit event failed", err);
  }

  return NextResponse.redirect(document.docgate_url);
}
