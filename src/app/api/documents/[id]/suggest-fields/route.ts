import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { getFromR2 } from "@/lib/r2";
import { suggestFields } from "@/lib/suggest-fields";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeAIProvider } from "@/lib/ai-provider";

// Stateless: computes suggestions and returns them, writes nothing to the
// database. The field editor holds every suggestion as unconfirmed local
// state until the sender explicitly accepts it (see field-editor.tsx) — so
// there's no "suggested" row type or status to reconcile server-side, and
// this route is safe to call repeatedly (auto-run once for a brand-new
// document, plus an explicit "Re-suggest" action any time after).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const ok = await checkRateLimit(`suggest-fields:${orgId}`, 20, 600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, org_id, file_path, page_count")
    .eq("id", id)
    .single();

  if (!doc || doc.org_id !== orgId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: org } = await supabase.from("organizations").select("ai_provider").eq("id", orgId).single();
  const provider = normalizeAIProvider(org?.ai_provider);

  let bytes: Buffer;
  try {
    const { body } = await getFromR2(doc.file_path);
    bytes = body;
  } catch (err) {
    console.error("R2 fetch failed for field suggestions", err);
    return NextResponse.json({ error: "Could not load the document." }, { status: 500 });
  }

  try {
    const { suggestions, unreadable } = await suggestFields(bytes, doc.page_count, provider);
    return NextResponse.json({ suggestions, unreadable });
  } catch (err) {
    console.error("Field suggestion failed", err);
    return NextResponse.json({ error: "Couldn't generate suggestions right now." }, { status: 500 });
  }
}
