import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { bodySchema } from "./schema";

// Sets (or clears) the DocGate link for a document — Business tier "gate an
// externally-owned asset behind whole-document completion." Deliberately
// just an external link (e.g. a Google Drive URL the sender already shared
// appropriately), not a Drive API integration — see plan.ts and
// DocGate_Feature_Scope.md for why.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "docGate")) {
    return NextResponse.json({ error: "DocGate requires the Business plan.", upgrade: true }, { status: 402 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "DocGate links must be a valid https:// URL." }, { status: 400 });
  }

  const { data: doc } = await supabase.from("documents").select("id, org_id").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { error } = await supabase
    .from("documents")
    .update({
      docgate_url: parsed.data.docgate_url || null,
      docgate_label: parsed.data.docgate_label || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
