import { NextResponse } from "next/server";
import { getSignerByToken } from "@/lib/signing";
import { getOrCreateDocumentSummary } from "@/lib/summarize-document";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Signer-facing "what am I signing?" summary. Lazily generated on first
// request and cached on the documents row (see summarize-document.ts), so
// this is cheap after the first call for a given document. Optional
// ?lang= query param (see summary-languages.ts for the supported set)
// translates the cached English summary; an unrecognized/missing value
// silently falls back to English rather than erroring.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const allowed = await checkRateLimit(`sign-summary:${getClientIp(request)}`, 20, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { document } = result;

  const lang = new URL(request.url).searchParams.get("lang") || "en";
  const outcome = await getOrCreateDocumentSummary(document.id, lang);
  if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: 502 });
  return NextResponse.json({ summary: outcome.summary });
}
