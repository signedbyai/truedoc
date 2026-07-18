import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getUserAndOrg } from "@/lib/org";
import { getFromR2, deleteFromR2 } from "@/lib/r2";
import { checkFreePlanDocCap } from "@/lib/plan";
import { keyBelongsTo } from "@/lib/upload-key";
import { MAX_FILE_BYTES } from "./upload-url/schema";
import { bodySchema } from "./schema";

// Step 2 of the direct-to-R2 upload: finalize. The browser has already PUT the
// PDF straight to R2 (see /api/documents/upload-url); this validates what
// actually landed and creates the document record. The file never transits
// this function's request body, so it isn't bound by Vercel's 4.5 MB cap —
// only the object is pulled back from R2 (free egress) to validate it and
// count pages. Any validation failure deletes the orphaned object.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { documentId, key, title, filename } = parsed.data;

  // The key came back from the client — it must be one this org + document was
  // actually issued a presigned URL for, never another org's prefix.
  if (!keyBelongsTo(orgId, documentId, key)) {
    return NextResponse.json({ error: "Invalid upload reference." }, { status: 400 });
  }

  // Re-check the plan cap right before the insert (upload-url checked it too,
  // but a burst could slip between the two calls).
  const capResponse = await checkFreePlanDocCap(supabase, orgId);
  if (capResponse) return capResponse;

  // Pull the uploaded object back to validate it.
  let bytes: Buffer;
  try {
    ({ body: bytes } = await getFromR2(key));
  } catch {
    return NextResponse.json({ error: "Upload not found — please try again." }, { status: 400 });
  }

  if (bytes.length > MAX_FILE_BYTES) {
    await deleteFromR2(key);
    return NextResponse.json({ error: "File is larger than 25MB" }, { status: 400 });
  }

  let pageCount = 1;
  try {
    const pdf = await PDFDocument.load(bytes);
    pageCount = pdf.getPageCount();
  } catch {
    await deleteFromR2(key);
    return NextResponse.json({ error: "That file doesn't look like a valid PDF" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      org_id: orgId,
      owner_id: user.id,
      title: title || filename.replace(/\.pdf$/i, ""),
      status: "draft",
      file_path: key,
      original_filename: filename,
      page_count: pageCount,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Insert document failed", error);
    await deleteFromR2(key); // don't leave the uploaded PDF orphaned in R2
    return NextResponse.json({ error: "Could not save the document record" }, { status: 500 });
  }

  await supabase.from("audit_events").insert({
    document_id: data.id,
    event_type: "created",
    metadata: { uploaded_by: user.id },
  });

  return NextResponse.json({ id: data.id });
}
