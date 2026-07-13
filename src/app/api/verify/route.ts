import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Public, no-login lookup: given the hash printed on a signed document's
// Certificate of Completion page (lib/generate-signed-pdf.ts), confirm it
// matches SignedBy's records. Deliberately returns only non-sensitive
// aggregate facts (title, completion date, signer count) — never signer
// names/emails/IPs — so this can be safely shared with anyone checking
// authenticity without exposing the parties' personal details.
//
// The hash itself is the "credential" here (at least 256 bits, not
// guessable), same trust model as a signer's signing_token — see
// lib/supabase/admin.ts. Accepts either a 64-hex-char SHA-256 hash (every
// document certificate issued before the SHA-512 switch) or a 128-hex-char
// SHA-512 hash (every one since) — document_hash is a plain `text` column,
// so both lengths already coexist fine in the same table; only this
// length check needed to know about both. Exported so the length/format
// rule itself is unit-testable without mocking Supabase.
export function isValidDocumentHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash) || /^[a-f0-9]{128}$/.test(hash);
}

export async function GET(request: Request) {
  const allowed = await checkRateLimit(`verify:${getClientIp(request)}`, 30, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const hash = (searchParams.get("hash") || "").trim().toLowerCase();

  if (!isValidDocumentHash(hash)) {
    return NextResponse.json({ error: "That doesn't look like a valid document hash." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("audit_events")
    .select("document_id, created_at")
    .eq("document_hash", hash)
    .eq("event_type", "completed")
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ verified: false });
  }

  const { data: doc } = await admin
    .from("documents")
    .select("title, organizations(name)")
    .eq("id", event.document_id)
    .single();

  const { count: signerCount } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", event.document_id);

  const orgData = doc?.organizations as unknown as { name?: string } | { name?: string }[] | undefined;
  const orgName = Array.isArray(orgData) ? orgData[0]?.name : orgData?.name;

  return NextResponse.json({
    verified: true,
    title: doc?.title ?? "Untitled document",
    completedAt: event.created_at,
    signerCount: signerCount ?? 0,
    orgName: orgName ?? null,
  });
}
