import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getUserAndOrg } from "@/lib/org";
import { uploadToR2 } from "@/lib/r2";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB — generous for contracts, keeps R2/function costs predictable

export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  // Authenticated, but still worth capping — an uncapped upload endpoint is
  // a cost/abuse vector (R2 storage + PDF parsing) even behind a login.
  const uploadOk = await checkRateLimit(`upload:${orgId}`, 30, 600);
  if (!uploadOk) {
    return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
  }

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || org.plan === "free") {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", startOfMonth.toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "You've hit the Free plan's 3 documents/month limit. Upgrade to keep going.", upgrade: true },
        { status: 402 }
      );
    }
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is larger than 25MB" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  let pageCount = 1;
  try {
    const pdf = await PDFDocument.load(bytes);
    pageCount = pdf.getPageCount();
  } catch {
    return NextResponse.json({ error: "That file doesn't look like a valid PDF" }, { status: 400 });
  }

  const documentId = crypto.randomUUID();
  const key = `${orgId}/${documentId}/${file.name}`;

  try {
    await uploadToR2(key, bytes, "application/pdf");
  } catch (err) {
    console.error("R2 upload failed", err);
    return NextResponse.json({ error: "Upload failed. Check R2 credentials." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      org_id: orgId,
      owner_id: user.id,
      title: title || file.name.replace(/\.pdf$/i, ""),
      status: "draft",
      file_path: key,
      original_filename: file.name,
      page_count: pageCount,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Insert document failed", error);
    return NextResponse.json({ error: "Could not save the document record" }, { status: 500 });
  }

  await supabase.from("audit_events").insert({
    document_id: data.id,
    event_type: "created",
    metadata: { uploaded_by: user.id },
  });

  return NextResponse.json({ id: data.id });
}
