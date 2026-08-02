import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkFreePlanDocCap } from "@/lib/plan";
import { uploadToR2 } from "@/lib/r2";
import { quoteToPdf } from "@/lib/quote-to-pdf";
import { selfDisplayName } from "@/lib/frequent-signers";
import { isSupportedDraftLang } from "@/lib/ai-draft-types";
import {
  computeQuoteTotals,
  QUOTE_CURRENCY_SYMBOLS,
  MAX_LINE_ITEMS,
  MAX_DESCRIPTION_CHARS,
  MAX_QUANTITY,
  MAX_UNIT_PRICE,
  MAX_TAX_RATE_PERCENT,
} from "@/lib/quote-types";

const MAX_TITLE_CHARS = 200;
const MAX_NAME_CHARS = 120;
const MAX_NOTES_CHARS = 1000;

// Re-validated here with a strict schema (rejects rather than the AI-side
// parser's lenient drop-bad-entries behavior) since this is what actually
// becomes a real document — a sender-edited line item that slipped past the
// client should fail loudly, not get silently discarded.
const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(MAX_DESCRIPTION_CHARS),
  quantity: z.number().finite().positive().max(MAX_QUANTITY),
  unitPrice: z.number().finite().min(0).max(MAX_UNIT_PRICE),
});

const bodySchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_CHARS),
  currency: z.enum(QUOTE_CURRENCY_SYMBOLS),
  billToName: z.string().trim().max(MAX_NAME_CHARS).optional(),
  billToEmail: z.string().trim().email().max(MAX_NAME_CHARS).optional().or(z.literal("")),
  validUntil: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(MAX_NOTES_CHARS).optional().or(z.literal("")),
  taxRatePercent: z.number().finite().min(0).max(MAX_TAX_RATE_PERCENT),
  items: z.array(lineItemSchema).min(1).max(MAX_LINE_ITEMS),
  // Optional — carried from the describe step's language picker through the
  // review step's client state (see magic-quote-form.tsx). Falls back to
  // English for a missing/unsupported code, same defensive precedent as
  // POST /api/quotes/draft's language field.
  language: z.string().optional(),
});

// Turns a (reviewed, possibly sender-edited) quote into a real document:
// computes the totals server-side (never trusts a client-sent total),
// renders the PDF, uploads it, and creates the same kind of `documents` row
// an upload/duplicate/AI-draft would — so it drops into the exact same
// field-editor/send flow afterward, with the customer's acceptance becoming
// a real e-signature event rather than a plain "Accept" click. Modeled on
// POST /api/documents/draft/finalize.
//
// Deliberately NOT gated by planHasFeature — Magic Quote is free on every
// plan (2026-07-21, direct instruction).
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId, orgs } = ctx;

  const ok = await checkRateLimit(`quote-finalize:${orgId}`, 20, 600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid quote details." }, { status: 400 });
  }
  const { title, currency, billToName, billToEmail, validUntil, notes, taxRatePercent, items } = parsed.data;
  const language = isSupportedDraftLang(parsed.data.language ?? "") ? (parsed.data.language as string) : "en";
  // Silent "Prepared by" (2026-07-23) — always the signed-in user's own
  // name, no picker/client input for this. Appended to the "From" line.
  const preparedByName = selfDisplayName(user);

  // Same free-plan monthly cap as a fresh upload/duplicate/AI-draft — this
  // still creates a new `documents` row.
  const capResponse = await checkFreePlanDocCap(supabase, orgId, "quote_finalize");
  if (capResponse) return capResponse;

  const fromName = orgs.find((o) => o.id === orgId)?.name ?? "";
  const totals = computeQuoteTotals(items, taxRatePercent);
  const quoteDateIso = new Date().toISOString();

  let pdfBytes: Buffer;
  let pageCount: number;
  try {
    const generated = await quoteToPdf({
      title,
      currency,
      fromName,
      billToName: billToName || "",
      billToEmail: billToEmail || null,
      preparedByName: preparedByName || null,
      quoteDateIso,
      validUntilIso: validUntil || null,
      notes: notes || null,
      totals,
      language,
    });
    pdfBytes = generated.bytes;
    pageCount = generated.pageCount;
  } catch (err) {
    console.error("Magic Quote PDF generation failed", err);
    return NextResponse.json({ error: "Couldn't create the PDF. Try again." }, { status: 500 });
  }

  const documentId = crypto.randomUUID();
  const safeFilename = `${title.replace(/[^\w.\- ]/g, "").trim() || "Quote"}.pdf`;
  const key = `${orgId}/${documentId}/${safeFilename}`;

  try {
    await uploadToR2(key, pdfBytes, "application/pdf");
  } catch (err) {
    console.error("R2 upload failed for Magic Quote document", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      org_id: orgId,
      owner_id: user.id,
      title,
      status: "draft",
      file_path: key,
      original_filename: safeFilename,
      page_count: pageCount,
    })
    .select("id")
    .single();

  if (error || !doc) {
    console.error("Create Magic Quote document failed", error);
    return NextResponse.json({ error: "Could not save the document record" }, { status: 500 });
  }

  await supabase.from("audit_events").insert({
    document_id: doc.id,
    event_type: "created",
    metadata: {
      ai_quote: true,
      total: totals.total,
      currency,
      created_at: quoteDateIso,
    },
  });

  return NextResponse.json({ id: doc.id });
}
