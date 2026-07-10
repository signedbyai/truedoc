import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: template } = await supabase.from("templates").select("id, org_id").eq("id", id).single();
  if (!template || template.org_id !== orgId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
