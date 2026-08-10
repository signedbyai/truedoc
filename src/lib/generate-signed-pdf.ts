import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2, uploadToR2 } from "@/lib/r2";
import { appUrl } from "@/lib/email";
import { generateCertificateBadge, generatePaymentBadge } from "@/lib/badge-asset";
import { BADGE_ASPECT } from "@/lib/badge-resize";
import { timestampWithFallback, type TimestampTsa } from "@/lib/timestamp-authority";

// If the uploaded PDF already had its own interactive form fields (an
// "AcroForm" — e.g. an existing fillable contract template), they're
// completely separate from SignedBy's own fields and would otherwise be
// left empty and still interactive, since everything else in this file
// only draws flat image/text directly onto the page rather than touching
// the original form. That's what caused real-world reports of "Adobe
// still asks me to sign it" and boxes that look doubled — SignedBy was
// drawing its own value next to/over the original, untouched, still-empty
// form field. Flattening bakes any existing field appearances into the
// page and removes the interactive fields entirely, so the original form
// can no longer prompt Adobe (or any other viewer) to fill or sign it.
// Exported and kept separate from generateSignedPdf so it's unit-testable
// without the Supabase/R2 plumbing the rest of that function needs.
// Never throws — a malformed or exotic AcroForm (rare, but seen with e.g.
// XFA-based forms) shouldn't block signing; the document is still legally
// captured via the audit trail either way.
export function flattenOriginalForm(pdfDoc: PDFDocument, documentId: string): void {
  try {
    pdfDoc.getForm().flatten();
  } catch (err) {
    console.error(`Failed to flatten original form fields for document ${documentId}`, err);
  }
}

export type StampField = {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | null;
};

// Stamps every filled-in field value onto pdfDoc's existing pages.
//
// Coordinates: fields store x/y/width/height as 0-1 fractions of the page,
// with y measured from the TOP (matching the browser canvas used by both the
// field editor and the signing view). pdf-lib's page origin is BOTTOM-LEFT,
// so every box has to be flipped vertically before drawing into it.
//
// Exported and kept separate from generateSignedPdf — same reasoning as
// flattenOriginalForm above — so this, the actual "did the signer's input
// end up in the right place in the final PDF" logic, is unit-testable
// without the Supabase/R2 plumbing the rest of that function needs. This
// is the part of the app with the least room for a silent regression: a
// field that doesn't stamp, stamps the wrong value, or stamps in the wrong
// place undermines the document's legal validity, not just its looks.
export async function stampFields(
  pdfDoc: PDFDocument,
  fields: StampField[],
  fonts: { font: Awaited<ReturnType<PDFDocument["embedFont"]>>; boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>> }
): Promise<void> {
  const pages = pdfDoc.getPages();
  const { font, boldFont } = fonts;

  for (const field of fields) {
    if (!field.value) continue;
    const page = pages[field.page - 1];
    if (!page) continue;

    const { width: pw, height: ph } = page.getSize();
    const boxX = field.x * pw;
    const boxWidth = field.width * pw;
    const boxHeight = field.height * ph;
    const boxTopY = ph - field.y * ph;
    const boxBottomY = boxTopY - boxHeight;

    try {
      if (field.type === "signature" || field.type === "initials") {
        if (!field.value.startsWith("data:image")) continue;
        const base64 = field.value.split(",")[1];
        if (!base64) continue;
        const imgBytes = Buffer.from(base64, "base64");
        const img = field.value.includes("image/jpeg")
          ? await pdfDoc.embedJpg(imgBytes)
          : await pdfDoc.embedPng(imgBytes);
        const scale = Math.min(boxWidth / img.width, boxHeight / img.height, 1);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        page.drawImage(img, {
          x: boxX + (boxWidth - drawWidth) / 2,
          y: boxBottomY + (boxHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      } else if (field.type === "checkbox") {
        if (field.value === "true") {
          const size = Math.min(boxWidth, boxHeight) * 0.75;
          page.drawText("X", {
            x: boxX + (boxWidth - size * 0.55) / 2,
            y: boxBottomY + (boxHeight - size) / 2,
            size,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        }
      } else {
        const fontSize = Math.min(11, Math.max(7, boxHeight * 0.6));
        page.drawText(field.value, {
          x: boxX + 2,
          y: boxBottomY + (boxHeight - fontSize) / 2,
          size: fontSize,
          font,
          color: rgb(0.06, 0.09, 0.16),
          maxWidth: Math.max(boxWidth - 4, 10),
        });
      }
    } catch (err) {
      // Never let one malformed field value abort the whole document.
      console.error(`Failed to stamp field ${field.id}`, err);
    }
  }
}

// Stamps every filled-in field value onto the original PDF, appends a
// certificate-of-completion page summarizing the audit trail, uploads the
// result to R2, and records the resulting key on documents.signed_file_path.
//
// `sealed` (2026-08-01, VERIFIED_BADGE_SCOPE.md) lets a caller swap the
// certificate page's framing from the normal multi-party "Certificate of
// Completion" copy to Verified Badge's "Sealed & Identity-Verified" copy —
// same function, same hash-then-certify pipeline, just different words on
// the page and an identity-verification line instead of a plain IP address.
// Optional and defaults to the original framing so every existing caller
// (sign/[token]/submit/route.ts) is unaffected.
export async function generateSignedPdf(
  documentId: string,
  opts?: { sealed?: { identityVerifiedName: string; identityVerifiedAt: string | null } }
): Promise<{ key: string; hash: string; timestamp?: { tsa: TimestampTsa; genTime: string; token: Buffer } }> {
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("id, org_id, title, file_path")
    .eq("id", documentId)
    .single();
  if (!doc) throw new Error("Document not found");

  const { data: fields } = await admin
    .from("document_fields")
    .select("id, type, page, x, y, width, height, value")
    .eq("document_id", documentId);

  const { data: signers } = await admin
    .from("signers")
    .select("id, name, email, signed_at, order_index")
    .eq("document_id", documentId)
    .order("order_index", { ascending: true });

  const { data: auditEvents } = await admin
    .from("audit_events")
    .select("signer_id, event_type, ip_address, created_at")
    .eq("document_id", documentId)
    .in("event_type", ["consent_given", "signed"]);

  const ipBySigner = new Map<string, string>();
  for (const ev of auditEvents || []) {
    if (ev.signer_id && ev.ip_address && !ipBySigner.has(ev.signer_id)) {
      ipBySigner.set(ev.signer_id, ev.ip_address);
    }
  }

  const { body: originalBytes } = await getFromR2(doc.file_path);
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  flattenOriginalForm(pdfDoc, documentId);
  await stampFields(pdfDoc, fields || [], { font, boldFont });

  // Hash the stamped content itself (before the certificate page), since
  // that's the part that actually carries legal meaning. SHA-512 (not
  // SHA-256) — SHA-256 was never actually broken or at meaningful risk
  // here (Grover's algorithm only gives a quadratic quantum speedup
  // against hash preimage search, so SHA-256 still lands around 128-bit
  // security even against a large-scale quantum attacker, which remains
  // computationally infeasible; the "quantum breaks crypto" concern is
  // really about asymmetric algorithms like RSA/ECC, not hash functions).
  // Switched anyway since it's a free upgrade — same SHA-2 family, no
  // slower on modern 64-bit hardware, larger margin. See
  // /api/verify/route.ts's hash-length check, which accepts both lengths
  // so certificates already issued with a SHA-256 hash keep verifying.
  const stampedBytes = await pdfDoc.save();
  const hash = crypto.createHash("sha512").update(stampedBytes).digest("hex");

  await addCertificatePage(pdfDoc, {
    title: doc.title,
    documentId,
    hash,
    signers: signers || [],
    ipBySigner,
    sealed: opts?.sealed,
  });

  const finalBytes = await pdfDoc.save();

  // RFC 3161 trusted timestamp (TIMESTAMP_AUTHORITY_SCOPE.md, built
  // 2026-08-03) — applied HERE, on finalBytes, as the very last mutation
  // before upload. Deliberately NOT applied earlier (e.g. before
  // addCertificatePage, as the scope doc originally sketched): pdf-rfc3161
  // embeds an RFC 3161 DocTimeStamp as a ByteRange-based PDF signature over
  // whatever bytes it's given, and any later pdfDoc.save() call is a full,
  // non-incremental rewrite (that's how pdf-lib works) — it would silently
  // invalidate that signature the moment addCertificatePage's own
  // pdfDoc.save() ran afterward. Timestamping finalBytes instead means the
  // uploaded PDF is the very last thing produced, nothing resaves it after.
  // One consequence: the certificate page's own drawn text (below, in
  // addCertificatePage) is written BEFORE this timestamp exists, so it can
  // only say a timestamp is applied in general, not name the specific TSA
  // or time — that specific claim lives on /verify and the badge-image
  // download routes instead, both of which render after this point.
  // Non-blocking: never throws, returns null on total failure, in which
  // case finalBytes (untouched) is uploaded and no timestamp fields are
  // persisted — same honest database-only fallback as before this feature.
  const timestamped = await timestampWithFallback(finalBytes);
  const uploadBytes = timestamped ? timestamped.pdf : finalBytes;

  const key = `${doc.org_id}/${documentId}/signed-${documentId}.pdf`;
  await uploadToR2(key, Buffer.from(uploadBytes), "application/pdf");
  await admin.from("documents").update({ signed_file_path: key }).eq("id", documentId);

  return {
    key,
    hash,
    timestamp: timestamped
      ? { tsa: timestamped.tsa, genTime: timestamped.genTime.toISOString(), token: Buffer.from(timestamped.token) }
      : undefined,
  };
}

export type CertificatePageOpts = {
  title: string;
  documentId: string;
  hash: string;
  signers: { id: string; name: string | null; email: string; signed_at: string | null }[];
  ipBySigner: Map<string, string>;
  // Verified Badge framing (VERIFIED_BADGE_SCOPE.md) — present only for a
  // self-sign seal, where there's exactly one signer (the freelancer
  // signing their own file) and the credibility claim is "identity
  // verified," not "had this IP address." identityVerifiedAt is kept
  // separate from the signer's signed_at deliberately: since the identity
  // check itself may be reused from an earlier verified session rather
  // than freshly performed for this specific seal (the whole point of the
  // reused-session cost/friction tradeoff — see console-actions.ts or
  // VERIFIED_BADGE_SCOPE.md's decision 6), the page has to distinguish
  // "signed on [date]" (true every time) from "identity verified on
  // [date]" (may be an earlier date), not imply both happened
  // simultaneously — same honesty standard as the AES-not-QES framing
  // used elsewhere in this project's legal-facing copy.
  sealed?: { identityVerifiedName: string; identityVerifiedAt: string | null };
};

// Exported (not just used internally by generateSignedPdf above) so
// verified-badge-actions.ts's "separate certificate" mode can build a
// certificate-only PDF (no original file content, just this one page) with
// the exact same layout/copy, rather than duplicating the drawing code.
export async function addCertificatePage(pdfDoc: PDFDocument, opts: CertificatePageOpts) {
  const page = pdfDoc.addPage([612, 792]); // US letter
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const dark = rgb(0.06, 0.09, 0.16);
  const gray = rgb(0.42, 0.45, 0.5);
  let y = 792 - 70;

  const heading = opts.sealed ? "Sealed & Identity-Verified" : "Certificate of Completion";
  page.drawText(heading, { x: margin, y, size: 18, font: boldFont, color: dark });
  y -= 26;
  page.drawText(opts.title, { x: margin, y, size: 12, font, color: dark, maxWidth: 612 - margin * 2 });
  y -= 20;
  page.drawText(`Document ID: ${opts.documentId}`, { x: margin, y, size: 9, font, color: gray });
  y -= 13;
  page.drawText(`${opts.sealed ? "Sealed" : "Completed"}: ${new Date().toISOString()}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: gray,
  });
  y -= 32;

  if (opts.sealed) {
    // One signer, self-addressed — see the type comment above for why
    // "signed on" and "identity verified on" are shown as two distinct
    // facts rather than one combined claim.
    page.drawText("Identity", { x: margin, y, size: 12, font: boldFont, color: dark });
    y -= 20;
    const signer = opts.signers[0];
    if (signer) {
      const label = signer.name ? `${signer.name} <${signer.email}>` : signer.email;
      page.drawText(label, { x: margin, y, size: 10, font: boldFont, color: dark, maxWidth: 612 - margin * 2 });
      y -= 14;
      const signedAt = signer.signed_at ? new Date(signer.signed_at).toISOString() : "not recorded";
      page.drawText(`Signed: ${signedAt}`, { x: margin + 12, y, size: 9, font, color: gray });
      y -= 13;
    }
    const verifiedLine = opts.sealed.identityVerifiedAt
      ? `Identity verified via government ID (Stripe) — ${opts.sealed.identityVerifiedName}, ${new Date(opts.sealed.identityVerifiedAt).toISOString()}`
      : `Identity verified via government ID (Stripe) — ${opts.sealed.identityVerifiedName}`;
    page.drawText(verifiedLine, { x: margin + 12, y, size: 9, font, color: gray, maxWidth: 612 - margin * 2 - 12 });
    y -= 24;
  } else {
    page.drawText("Signers", { x: margin, y, size: 12, font: boldFont, color: dark });
    y -= 20;

    for (const signer of opts.signers) {
      if (y < 140) break; // simple MVP guard against overflow on very long signer lists —
      // leaves room for the checksum + verify-URL block drawn after this loop
      const ip = opts.ipBySigner.get(signer.id) || "unavailable";
      const label = signer.name ? `${signer.name} <${signer.email}>` : signer.email;
      page.drawText(label, { x: margin, y, size: 10, font: boldFont, color: dark, maxWidth: 612 - margin * 2 });
      y -= 14;
      const signedAt = signer.signed_at ? new Date(signer.signed_at).toISOString() : "not recorded";
      page.drawText(`Signed: ${signedAt}    IP address: ${ip}`, { x: margin + 12, y, size: 9, font, color: gray });
      y -= 24;
    }
  }

  y -= 8;
  page.drawText(
    opts.sealed
      ? "This certificate was generated by SignedBy and reflects the identity check and file hash captured at"
      : "This certificate was generated by SignedBy and reflects the audit trail captured during the",
    { x: margin, y, size: 8, font, color: gray }
  );
  y -= 11;
  page.drawText(
    opts.sealed
      ? "the time of sealing, consistent with the U.S. ESIGN Act and UETA."
      : "electronic signing process, consistent with the U.S. ESIGN Act and UETA.",
    { x: margin, y, size: 8, font, color: gray }
  );
  y -= 20;
  page.drawText("SHA-512 checksum of the signed document:", { x: margin, y, size: 8, font: boldFont, color: gray });
  y -= 11;
  page.drawText(opts.hash, { x: margin, y, size: 7, font, color: gray });
  y -= 20;

  // Generic, TSA-agnostic line (TIMESTAMP_AUTHORITY_SCOPE.md, 2026-08-03).
  // This page is drawn and saved BEFORE generateSignedPdf's final save
  // step, which is where the actual RFC 3161 timestamp gets applied (see
  // that function's comment) — so at the moment this text is drawn, it's
  // not yet known which TSA will succeed, or whether one will at all. Kept
  // deliberately vague for that reason; the specific TSA name and time are
  // only ever claimed on /verify and the badge-image download routes,
  // which render after sealing completes and can check what actually
  // happened for this document.
  page.drawText("Visit signedby.ai/verify to check whether a trusted third-party timestamp is on file.", {
    x: margin,
    y,
    size: 7,
    font,
    color: gray,
  });
  y -= 16;

  // QR + mark badge (2026-08-01), replacing what used to be two lines of
  // plain-text "paste the hash at signedby.ai/verify" instructions — a QR
  // that jumps straight to /verify?hash=... beats making someone manually
  // copy 128 hex characters. Applies to EVERY certificate page, not just
  // Verified Badge ones (see VERIFIED_BADGE_SCOPE.md's "Related, smaller
  // addition" section) — this is a real, independent UX improvement to the
  // existing /verify flow, decoupled from the rest of that feature. Never
  // lets badge generation failure (missing asset, sharp/QR error) block a
  // signed PDF from finishing — falls back to the old plain-text pointer.
  try {
    const verifyUrl = `${appUrl()}/verify?hash=${opts.hash}`;
    const badgePng = await generateCertificateBadge(verifyUrl);
    const badgeImage = await pdfDoc.embedPng(badgePng);
    const badgeWidth = 210;
    const badgeHeight = badgeWidth * (130 / 300);
    page.drawImage(badgeImage, { x: margin, y: y - badgeHeight, width: badgeWidth, height: badgeHeight });
  } catch (err) {
    console.error(`Failed to embed verify badge on certificate page for document ${opts.documentId}`, err);
    page.drawText("Anyone can independently verify this document is genuine, with no account needed, at:", {
      x: margin,
      y,
      size: 8,
      font,
      color: gray,
    });
    y -= 11;
    page.drawText(`${appUrl()}/verify`, { x: margin, y, size: 7, font, color: gray });
  }
}

// Certificate-only PDF (no original file content) for Verified Badge's
// "separate" and "both" certificateMode options — same drawing code as the
// appended path above, just on a fresh blank document instead of appended
// to the sealed original. See verified-badge-actions.ts.
export async function buildStandaloneCertificatePdf(opts: CertificatePageOpts): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  await addCertificatePage(pdfDoc, opts);
  return pdfDoc.save();
}

export type BadgeStampOpts = {
  /** 1-indexed, matching document_fields' own page convention. */
  page: number;
  /** Normalized 0-1, top-left corner, fractions of page width/height —
   *  same convention as document_fields.x/y (see stampFields above). */
  x: number;
  y: number;
  /** Normalized 0-1, fraction of page WIDTH. Height is always derived from
   *  BADGE_ASPECT at draw time (badge-resize.ts) — never independently
   *  stretched. */
  width: number;
  verifyUrl: string;
  /** Business tier only, and only when the org actually set one on this
   *  seal (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V2.4, "no longer
   *  optional once payment link is live"). When present, a second, visibly
   *  distinct QR (generatePaymentBadge — blue, dashed border, wallet-style
   *  "$" mark, "Pay invoice"/"Scan to pay") is stamped stacked above the
   *  verification badge with a real gap between them — never fused into
   *  one graphic, per V1.5's hard separation constraint. */
  paymentUrl?: string;
};

// Vertical gap (PDF points) between the payment badge and the verification
// badge when both are stamped — keeps them reading as two separate things
// stacked, not one combined control, even before anyone reads the labels.
const BADGE_STACK_GAP = 10;
// Padding around each badge's own opaque backing rectangle, so the white
// card visibly extends past the badge image itself rather than exactly
// tracing its edges (V1.1: "a light opaque background rectangle behind it
// so even landing over existing content stays legible rather than muddying
// into it").
const BADGE_BACKING_PAD = 6;

/** Draws SignedBy's compact verification badge (and, for Business orgs with
 *  a payment link set, a second visually-distinct payment QR stacked above
 *  it) onto an EXISTING page of the given pdfDoc, at the resolved
 *  page/x/y/width. This is the "Badge-on sealed PDF" output
 *  (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.4) — a corner-stamped copy
 *  of the ORIGINAL document, produced unconditionally on every Verified
 *  Badge seal regardless of certificate_mode, entirely separate from the
 *  appended-certificate-page pipeline above. Mutates pdfDoc in place;
 *  caller is responsible for pdfDoc.load()-ing the ORIGINAL bytes (not the
 *  already-certificate-stamped ones) before calling this, and for
 *  save()/upload() after.
 */
export async function stampBadgeOnPage(pdfDoc: PDFDocument, opts: BadgeStampOpts): Promise<void> {
  const pages = pdfDoc.getPages();
  const page = pages[opts.page - 1];
  if (!page) throw new Error(`Badge stamp: page ${opts.page} doesn't exist on this document`);

  const { width: pw, height: ph } = page.getSize();
  const drawWidth = opts.width * pw;
  const drawHeight = drawWidth * BADGE_ASPECT;
  const boxX = opts.x * pw;
  const boxTopY = ph - opts.y * ph;
  const verifyBottomY = boxTopY - drawHeight;

  const [badgePng, paymentPng] = await Promise.all([
    generateCertificateBadge(opts.verifyUrl),
    opts.paymentUrl ? generatePaymentBadge(opts.paymentUrl) : Promise.resolve(null),
  ]);

  const badgeImage = await pdfDoc.embedPng(badgePng);
  page.drawRectangle({
    x: boxX - BADGE_BACKING_PAD,
    y: verifyBottomY - BADGE_BACKING_PAD,
    width: drawWidth + BADGE_BACKING_PAD * 2,
    height: drawHeight + BADGE_BACKING_PAD * 2,
    color: rgb(1, 1, 1),
    opacity: 0.92,
  });
  page.drawImage(badgeImage, { x: boxX, y: verifyBottomY, width: drawWidth, height: drawHeight });

  if (paymentPng) {
    const paymentBottomY = boxTopY + BADGE_STACK_GAP;
    const paymentImage = await pdfDoc.embedPng(paymentPng);
    page.drawRectangle({
      x: boxX - BADGE_BACKING_PAD,
      y: paymentBottomY - BADGE_BACKING_PAD,
      width: drawWidth + BADGE_BACKING_PAD * 2,
      height: drawHeight + BADGE_BACKING_PAD * 2,
      color: rgb(1, 1, 1),
      opacity: 0.92,
    });
    page.drawImage(paymentImage, { x: boxX, y: paymentBottomY, width: drawWidth, height: drawHeight });
  }
}

/** Loads the ORIGINAL file bytes fresh (never the certificate-stamped
 *  copy — the corner stamp is a separate artifact off the untouched
 *  original, same "byte-for-byte" starting point "separate" certificate
 *  mode uses) and draws the badge stamp on top, per stampBadgeOnPage
 *  above. Returns the finished bytes; caller (sealDocumentAction) handles
 *  R2 upload and documents.badge_stamped_file_path, same split as
 *  buildStandaloneCertificatePdf above. */
export async function buildBadgeStampedPdf(originalBytes: Uint8Array, opts: BadgeStampOpts): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  await stampBadgeOnPage(pdfDoc, opts);
  return pdfDoc.save();
}
