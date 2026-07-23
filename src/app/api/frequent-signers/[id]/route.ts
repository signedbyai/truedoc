import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: signer } = await supabase.from("frequent_signers").select("id, org_id").eq("id", id).single();
  if (!signer || signer.org_id !== orgId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { error } = await supabase.from("frequent_signers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
