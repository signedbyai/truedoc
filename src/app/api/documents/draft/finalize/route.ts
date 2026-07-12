import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkFreePlanDocCap, planHasFeature } from "@/lib/plan";
import { uploadToR2 } from "@/lib/r2";
import { textToPdf } from "@/lib/text-to-pdf";
import { DOCUMENT_TYPES } from "@/lib/ai-draft-types";

const MAX_BODY_CHARS = 30000; // generous — a Sonnet-drafted contract is nowhere near this, just a sanity cap

const bodySchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES.map((t) => t.id) as [string, ...string[]]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(MAX_BODY_CHARS),
  // Re-checked here too (not just on the earlier /draft call) since this is
  // the step that actually creates the document — see draft/route.ts's
  // comment on the same field.
  disclaimerAccepted: z.literal(true),
});

// Turns a (possibly sender-edited) AI draft into a real document: renders
// the text to a PDF, uploads it, and creates the same kind of `documents`
// row an upload or duplicate would — so it drops into the exact same
// field-editor/send flow afterward. Modeled on POST /api/documents (the
// upload route) and POST /api/documents/[id]/duplicate.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  // Re-checked here too (not just at /draft) — a plan could have been
  // downgraded between generating and finalizing a draft, or this could be
  // called directly without going through /draft at all.
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!planHasFeature(org?.plan, "aiDraft")) {
    return NextResponse.json(
      { error: "AI-drafted documents are a Starter plan feature. Upgrade to create this document.", upgrade: true },
      { status: 402 }
    );
  }

  const ok = await checkRateLimit(`draft-finalize:${orgId}`, 20, 600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid document details." }, { status: 400 });
  }
  const { documentType, title, body } = parsed.data;

  // Same free-plan monthly cap as a fresh upload/duplicate — this still
  // creates a new `documents` row.
  const capResponse = await checkFreePlanDocCap(supabase, orgId);
  if (capResponse) return capResponse;

  let pdfBytes: Buffer;
  let pageCount: number;
  try {
    const generated = await textToPdf(title, body);
    pdfBytes = generated.bytes;
    pageCount = generated.pageCount;
  } catch (err) {
    console.error("AI-draft PDF generation failed", err);
    return NextResponse.json({ error: "Couldn't create the PDF. Try again." }, { status: 500 });
  }

  const documentId = crypto.randomUUID();
  const safeFilename = `${title.replace(/[^\w.\- ]/g, "").trim() || "Document"}.pdf`;
  const key = `${orgId}/${documentId}/${safeFilename}`;

  try {
    await uploadToR2(key, pdfBytes, "application/pdf");
  } catch (err) {
    console.error("R2 upload failed for AI-drafted document", err);
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
    console.error("Create AI-drafted document failed", error);
    return NextResponse.json({ error: "Could not save the document record" }, { status: 500 });
  }

  await supabase.from("audit_events").insert({
    document_id: doc.id,
    event_type: "created",
    metadata: {
      ai_drafted: true,
      document_type: documentType,
      disclaimer_accepted_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({ id: doc.id });
}
