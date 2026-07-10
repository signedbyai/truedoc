import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";

export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data, error } = await supabase
    .from("templates")
    .select("id, name, page_count, field_map, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const templates = (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    pageCount: t.page_count,
    fieldCount: Array.isArray(t.field_map) ? t.field_map.length : 0,
    createdAt: t.created_at,
  }));

  return NextResponse.json({ templates });
}
