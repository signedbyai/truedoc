import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { getSignedUploadUrl } from "@/lib/r2";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkFreePlanDocCap } from "@/lib/plan";
import { documentKey } from "@/lib/upload-key";
import { bodySchema } from "./schema";

// Step 1 of the direct-to-R2 upload. Authenticates, enforces the upload rate
// limit and the free-plan document cap (so we fail BEFORE the browser uploads
// megabytes), then issues a presigned PUT URL for a server-chosen key. The
// browser PUTs straight to R2 (bypassing Vercel's 4.5 MB function-body cap),
// then calls POST /api/documents to finalize. Nothing is written to the DB
// here — an un-finalized object just sits in R2 until finalize (or is left as
// a harmless orphan; a bucket lifecycle rule can sweep those).
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const uploadOk = await checkRateLimit(`upload:${orgId}`, 30, 600);
  if (!uploadOk) {
    return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
  }

  const capResponse = await checkFreePlanDocCap(supabase, orgId, "upload_url");
  if (capResponse) return capResponse;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!/\.pdf$/i.test(parsed.data.filename)) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const documentId = crypto.randomUUID();
  const key = documentKey(orgId, documentId, parsed.data.filename);

  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUploadUrl(key, "application/pdf");
  } catch (err) {
    console.error("Presign upload URL failed", err);
    return NextResponse.json({ error: "Couldn't start the upload. Try again." }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, key, documentId });
}
