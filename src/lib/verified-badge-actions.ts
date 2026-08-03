import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2, uploadToR2 } from "@/lib/r2";
import { appUrl } from "@/lib/email";
import { checkConsoleCap, recordConsoleUsage } from "@/lib/console-usage";
import { getOrgIdentityStatus } from "@/lib/identity";
import { grantSealCreditReferralReward } from "@/lib/referral";
import { generateSignedPdf, buildStandaloneCertificatePdf, flattenOriginalForm } from "@/lib/generate-signed-pdf";
import { timestampWithFallback, type TimestampTsa } from "@/lib/timestamp-authority";
import type { ConsoleActionError } from "@/lib/console-actions";
import { auditProvenance } from "@/lib/console-actions";

// The Verified Badge sealing primitive (VERIFIED_BADGE_SCOPE.md). Self-sign
// pivot (decision 6): a Badge is an ordinary document sent to exactly one
// signer — the org itself, self-addressed — so this reuses documents/
// signers/audit_events completely unmodified rather than inventing a
// signer-less primitive. The one genuinely new precondition is identity:
// the org must have a non-stale Stripe Identity check on file (org-level,
// reused across seals — see identity.ts) before its first seal, and every
// seal after that reuses it rather than re-verifying.
//
// Entry points: console chat's seal_document confirm action and the MCP
// seal_document tool, both calling this function directly — same shared-
// action-function shape as sendDocumentAction (console-actions.ts).

export type CertificateMode = "appended" | "separate" | "both";

export type SealActionError = ConsoleActionError & { needsIdentityVerification?: true };

export type SealResult = {
  ok: true;
  documentId: string;
  verifyUrl: string;
  hasSignedFile: boolean; // appended/both — download via the existing signed-file routes
  hasCertificateFile: boolean; // separate/both — download via the new certificate routes
};

/** The document row a seal acts on must already exist (created via the
 *  same presigned-upload + finalize flow the console's "upload a template"
 *  feature already uses — see console-chat.tsx's handleVerifiedBadgeFileSelected —
 *  or, for the MCP path, a document the tool itself just created from
 *  inline file bytes), belong to this org, not already be sealed, and have
 *  no signers yet (a fresh upload, never sent to anyone). */
async function loadSealableDocument(orgId: string, documentId: string) {
  const admin = createAdminClient();
  const notSealable: { admin: ReturnType<typeof createAdminClient>; doc: null } = { admin, doc: null };

  const { data: doc } = await admin
    .from("documents")
    .select("id, org_id, title, file_path, owner_id, is_verified_badge, status")
    .eq("id", documentId)
    .single();
  if (!doc || doc.org_id !== orgId) return notSealable;
  if (doc.is_verified_badge || doc.status !== "draft") return notSealable;
  const { count: existingSigners } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
  if ((existingSigners ?? 0) > 0) return notSealable;
  return { admin, doc };
}

export async function sealDocumentAction(params: {
  orgId: string;
  documentId: string;
  certificateMode: CertificateMode;
  metered: boolean;
  source: "console" | "mcp";
}): Promise<SealResult | SealActionError> {
  const { orgId, documentId, certificateMode, metered, source } = params;

  const identity = await getOrgIdentityStatus(orgId);
  if (!identity.verified || identity.stale) {
    return {
      ok: false,
      status: 412,
      needsIdentityVerification: true,
      error: identity.verified
        ? "Your identity verification has expired — verify again in Settings before sealing another document."
        : "Verify your identity once in Settings before sealing your first Verified Badge document.",
    };
  }

  if (metered) {
    const cap = await checkConsoleCap(orgId);
    if (!cap.allowed) return { ok: false, error: cap.reason, status: 402 };
  }

  const { admin, doc } = await loadSealableDocument(orgId, documentId);
  if (!doc) {
    return { ok: false, error: "That file isn't available to seal — upload a PDF first.", status: 404 };
  }

  const { data: org } = await admin.from("organizations").select("name, owner_id").eq("id", orgId).single();
  if (!org) return { ok: false, error: "Organization not found.", status: 404 };

  const { data: ownerData } = await admin.auth.admin.getUserById(org.owner_id);
  const ownerEmail = ownerData?.user?.email;
  if (!ownerEmail) return { ok: false, error: "Couldn't resolve the account's email to seal against.", status: 500 };

  // The signer IS the org — self-addressed, no invite email, no
  // /sign/[token] visit (VERIFIED_BADGE_SCOPE.md's "self-sign experience"
  // section). name comes from the verified identity check, not whatever
  // the account profile says, since that's the credential actually being
  // certified.
  const now = new Date().toISOString();
  const { data: signer, error: signerError } = await admin
    .from("signers")
    .insert({
      document_id: doc.id,
      email: ownerEmail,
      name: identity.name,
      order_index: 0,
      status: "signed",
      sent_at: now,
      signed_at: now,
      auth_required: false,
    })
    .select("id, name, email, signed_at")
    .single();
  if (signerError || !signer) {
    console.error("Verified Badge: create self-signer failed", signerError);
    return { ok: false, error: "Couldn't seal the document.", status: 500 };
  }

  const provenance = auditProvenance(source);
  // 'sent' and 'completed' land back-to-back, same as normal flow's shape
  // but with no real time gap between them — there's no external signer to
  // wait on (VERIFIED_BADGE_SCOPE.md). 'consent_given'/'signed' mirror
  // sign/[token]/submit/route.ts's own event pair so this document's audit
  // trail reads identically to a normal one, just compressed into one
  // synchronous server-side action instead of a signer's own click.
  await admin.from("audit_events").insert([
    { document_id: doc.id, event_type: "created", metadata: { verified_badge: true, ...provenance } },
    { document_id: doc.id, signer_id: signer.id, event_type: "sent", metadata: { ...provenance } },
    { document_id: doc.id, signer_id: signer.id, event_type: "consent_given", metadata: { self_sign: true } },
    { document_id: doc.id, signer_id: signer.id, event_type: "signed", metadata: { self_sign: true } },
  ]);

  let hash: string;
  let hasSignedFile = false;
  let hasCertificateFile = false;
  // RFC 3161 trusted timestamp (TIMESTAMP_AUTHORITY_SCOPE.md, 2026-08-03).
  // "separate" mode has no signed_file_path — buildStandaloneCertificatePdf's
  // output IS the only sealed artifact that exists for this document, so
  // it's timestamped directly, same as generateSignedPdf does internally
  // for appended/both. Whichever branch runs, at most one timestamp is
  // captured per seal (there's only one completed_event row to attach it to).
  let timestamp: { tsa: TimestampTsa; genTime: string; token: Buffer } | undefined;

  try {
    if (certificateMode === "separate") {
      // "Byte-for-byte untouched" (VERIFIED_BADGE_SCOPE.md) — hash the raw
      // original bytes directly, no pdf-lib round trip, and leave
      // signed_file_path null: the untouched file is already available via
      // the existing file_path column, nothing new to store for it.
      const { body: originalBytes } = await getFromR2(doc.file_path);
      hash = crypto.createHash("sha512").update(originalBytes).digest("hex");

      let certBytes = await buildStandaloneCertificatePdf({
        title: doc.title,
        documentId: doc.id,
        hash,
        signers: [{ id: signer.id, name: signer.name, email: signer.email, signed_at: signer.signed_at }],
        ipBySigner: new Map(),
        sealed: { identityVerifiedName: identity.name, identityVerifiedAt: identity.verifiedAt },
      });
      // Timestamp the standalone certificate as the last step before
      // upload — same reasoning as generate-signed-pdf.ts (a later pdf-lib
      // resave would invalidate an RFC 3161 signature), and nothing here
      // mutates certBytes again after this. Non-blocking: null just means
      // no timestamp, certBytes stays as built above.
      const timestamped = await timestampWithFallback(certBytes);
      if (timestamped) {
        certBytes = Buffer.from(timestamped.pdf);
        timestamp = { tsa: timestamped.tsa, genTime: timestamped.genTime.toISOString(), token: Buffer.from(timestamped.token) };
      }
      const certKey = `${orgId}/${doc.id}/certificate-${doc.id}.pdf`;
      await uploadToR2(certKey, Buffer.from(certBytes), "application/pdf");
      await admin.from("documents").update({ certificate_file_path: certKey }).eq("id", doc.id);
      hasCertificateFile = true;
    } else {
      // appended or both — generateSignedPdf's existing pipeline (load,
      // flatten, stamp zero fields since there's nothing to stamp for a
      // self-sign seal, hash, append the certificate page, timestamp,
      // upload as signed_file_path). Reused wholesale rather than
      // duplicated — its own timestamp is what gets persisted below.
      const result = await generateSignedPdf(doc.id, {
        sealed: { identityVerifiedName: identity.name, identityVerifiedAt: identity.verifiedAt },
      });
      hash = result.hash;
      hasSignedFile = true;
      timestamp = result.timestamp;

      if (certificateMode === "both") {
        // "both" mode's separate certificate copy deliberately does NOT get
        // its own independent timestamp call — it's built from the same
        // hash/signers as the already-timestamped signed_file_path above,
        // and one real TSA round trip per seal (not per artifact) is the
        // right unit here, same as the hash itself is computed once.
        const certBytes = await buildStandaloneCertificatePdf({
          title: doc.title,
          documentId: doc.id,
          hash,
          signers: [{ id: signer.id, name: signer.name, email: signer.email, signed_at: signer.signed_at }],
          ipBySigner: new Map(),
          sealed: { identityVerifiedName: identity.name, identityVerifiedAt: identity.verifiedAt },
        });
        const certKey = `${orgId}/${doc.id}/certificate-${doc.id}.pdf`;
        await uploadToR2(certKey, Buffer.from(certBytes), "application/pdf");
        await admin.from("documents").update({ certificate_file_path: certKey }).eq("id", doc.id);
        hasCertificateFile = true;
      }
    }
  } catch (err) {
    console.error(`Verified Badge: sealing pipeline failed for document ${doc.id}`, err);
    return { ok: false, error: "Couldn't generate the sealed file. Try again.", status: 500 };
  }

  await admin
    .from("documents")
    .update({ status: "completed", is_verified_badge: true, certificate_mode: certificateMode })
    .eq("id", doc.id);

  // identity_verified_at is snapshotted into this event's metadata rather
  // than left for /api/verify/route.ts to read live off organizations —
  // that column can move forward after a later re-verification, which
  // would make an OLDER seal's ledger page silently start showing a NEWER
  // "identity verified on" date than what was actually true at the moment
  // this specific document was sealed. Same honesty standard the "signed
  // on X vs. identity verified on Y" distinction itself exists for.
  const { data: completedEvent } = await admin
    .from("audit_events")
    .insert({
      document_id: doc.id,
      event_type: "completed",
      metadata: { verified_badge: true, identity_verified_at: identity.verifiedAt, ...provenance },
    })
    .select("id")
    .single();
  if (completedEvent) {
    await admin
      .from("audit_events")
      .update({
        document_hash: hash,
        ...(timestamp
          ? { timestamp_tsa: timestamp.tsa, timestamp_gen_time: timestamp.genTime, timestamp_token: timestamp.token }
          : {}),
      })
      .eq("id", completedEvent.id);
  }

  if (metered) await recordConsoleUsage(orgId);

  // Free-tier seal-credit referral reward (REFERRAL_SCOPE.md) — fires once,
  // on this org's first-ever seal (the qualifying event). Best-effort: a
  // failure here must never block the seal itself, same reasoning as the
  // plan_cap_hits logging in plan.ts.
  try {
    const { count: sealCount } = await admin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_verified_badge", true);
    if (sealCount === 1) await grantSealCreditReferralReward(admin, orgId);
  } catch (err) {
    console.error("Referral seal-credit reward failed", err);
  }

  return {
    ok: true,
    documentId: doc.id,
    verifyUrl: `${appUrl()}/verify?hash=${hash}`,
    hasSignedFile,
    hasCertificateFile,
  };
}

// Referenced by verified-badge-actions.test.ts and by the MCP tool's own
// "is this a real PDF" pre-check — kept here rather than duplicated,
// exported mainly so a caller can validate uploaded bytes are a loadable
// PDF before creating a documents row for them at all.
export async function isLoadablePdf(bytes: Uint8Array): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(bytes);
    flattenOriginalForm(doc, "precheck");
    return true;
  } catch {
    return false;
  }
}
