import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidDocumentHash } from "./hash";

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
// length check needed to know about both. The length/format rule lives in
// ./hash so it stays unit-testable without importing this route file.

export async function GET(request: Request) {
  const allowed = await checkRateLimit(`verify:${getClientIp(request)}`, 30, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  // Strip all whitespace, not just leading/trailing -- see matching
  // comment in verify/page.tsx. Defense in depth: also protects direct
  // API callers, not just the paste-into-the-form path.
  const hash = (searchParams.get("hash") || "").replace(/\s+/g, "").toLowerCase();

  if (!isValidDocumentHash(hash)) {
    return NextResponse.json({ error: "That doesn't look like a valid document hash." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("audit_events")
    .select("document_id, created_at, metadata, timestamp_tsa, timestamp_gen_time")
    .eq("document_hash", hash)
    .eq("event_type", "completed")
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ verified: false });
  }

  const { data: doc } = await admin
    .from("documents")
    .select("title, is_verified_badge, org_id, payment_link_url, payment_label, organizations(name)")
    .eq("id", event.document_id)
    .single();

  const { count: signerCount } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", event.document_id);

  const orgData = doc?.organizations as unknown as { name?: string } | { name?: string }[] | undefined;
  const orgName = Array.isArray(orgData) ? orgData[0]?.name : orgData?.name;

  // Verified Badge framing (VERIFIED_BADGE_SCOPE.md): the ledger entry
  // shows the signing individual's name as primary — safe since every
  // Badge has exactly one real, verified signer behind it (the self-sign
  // pivot) — plus org name as secondary context if one exists. Also
  // surfaces identityVerifiedAt distinct from completedAt: the identity
  // check itself may be reused from an earlier verified session, so the
  // page has to be able to say "signed on X" and "identity verified on Y"
  // as two different facts rather than implying they happened
  // simultaneously (the "remaining nuance" this doc's open questions
  // called out). Read from this event's own metadata (snapshotted at seal
  // time by sealDocumentAction), not live off organizations — see that
  // function's comment on why a later re-verification shouldn't be able to
  // retroactively change what an older seal's ledger page claims.
  let sealedBy: string | null = null;
  let identityVerifiedAt: string | null = null;
  if (doc?.is_verified_badge) {
    const { data: signer } = await admin
      .from("signers")
      .select("name, email")
      .eq("document_id", event.document_id)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    sealedBy = signer?.name || signer?.email || null;

    const metadata = event.metadata as Record<string, unknown> | null;
    identityVerifiedAt = typeof metadata?.identity_verified_at === "string" ? metadata.identity_verified_at : null;
  }

  return NextResponse.json({
    verified: true,
    title: doc?.title ?? "Untitled document",
    completedAt: event.created_at,
    signerCount: signerCount ?? 0,
    orgName: orgName ?? null,
    isVerifiedBadge: doc?.is_verified_badge ?? false,
    sealedBy,
    identityVerifiedAt,
    // RFC 3161 trusted timestamp (TIMESTAMP_AUTHORITY_SCOPE.md, 2026-08-03;
    // eurotsa tier added 2026-08-12, EUROTSA_SCOPE.md). timestampTsa null
    // means this document sealed before the feature shipped, or all TSAs
    // were unreachable at seal time — the page falls back to its
    // pre-existing, still-honest wording in that case. Which TSA matters to
    // the page: a Sectigo-backed timestamp chains to an already-trusted
    // root and needs no caveat; eurotsa/freetsa both used a self-signed CA
    // and independent re-verification needs a manual trust-store step, so
    // the client branches its copy on this field rather than treating all
    // three as equivalent.
    timestampTsa: event.timestamp_tsa,
    timestampGenTime: event.timestamp_gen_time,
    // IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.5 — a Business org's own
    // external payment link, shown ONLY when actually set on this
    // document (payment_link_url is itself already gated to Business at
    // write time, PUT /api/documents/[id]/payment). Deliberately its own
    // top-level fields, never merged into the verification claim above —
    // the page renders this as a visually distinct, separately-labeled
    // section, per the hard separation constraint that whole feature
    // exists for.
    paymentLinkUrl: doc?.payment_link_url ?? null,
    paymentLabel: doc?.payment_label ?? null,
  });
}
