import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2, uploadToR2 } from "@/lib/r2";
import { appUrl } from "@/lib/email";

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
export async function generateSignedPdf(documentId: string): Promise<{ key: string; hash: string }> {
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
  });

  const finalBytes = await pdfDoc.save();
  const key = `${doc.org_id}/${documentId}/signed-${documentId}.pdf`;
  await uploadToR2(key, Buffer.from(finalBytes), "application/pdf");
  await admin.from("documents").update({ signed_file_path: key }).eq("id", documentId);

  return { key, hash };
}

async function addCertificatePage(
  pdfDoc: PDFDocument,
  opts: {
    title: string;
    documentId: string;
    hash: string;
    signers: { id: string; name: string | null; email: string; signed_at: string | null }[];
    ipBySigner: Map<string, string>;
  }
) {
  const page = pdfDoc.addPage([612, 792]); // US letter
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const dark = rgb(0.06, 0.09, 0.16);
  const gray = rgb(0.42, 0.45, 0.5);
  let y = 792 - 70;

  page.drawText("Certificate of Completion", { x: margin, y, size: 18, font: boldFont, color: dark });
  y -= 26;
  page.drawText(opts.title, { x: margin, y, size: 12, font, color: dark, maxWidth: 612 - margin * 2 });
  y -= 20;
  page.drawText(`Document ID: ${opts.documentId}`, { x: margin, y, size: 9, font, color: gray });
  y -= 13;
  page.drawText(`Completed: ${new Date().toISOString()}`, { x: margin, y, size: 9, font, color: gray });
  y -= 32;

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

  y -= 8;
  page.drawText(
    "This certificate was generated by SignedBy and reflects the audit trail captured during the",
    { x: margin, y, size: 8, font, color: gray }
  );
  y -= 11;
  page.drawText(
    "electronic signing process, consistent with the U.S. ESIGN Act and UETA.",
    { x: margin, y, size: 8, font, color: gray }
  );
  y -= 20;
  page.drawText("SHA-512 checksum of the signed document:", { x: margin, y, size: 8, font: boldFont, color: gray });
  y -= 11;
  page.drawText(opts.hash, { x: margin, y, size: 7, font, color: gray });
  y -= 18;
  page.drawText("Anyone can independently verify this document is genuine, with no account needed, at:", {
    x: margin,
    y,
    size: 8,
    font,
    color: gray,
  });
  y -= 11;
  page.drawText(`${appUrl()}/verify?hash=${opts.hash}`, { x: margin, y, size: 7, font, color: gray });
}
