import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";

// GET /api/v1/templates — list the org's templates (id + name).
// CRM_MCP_READINESS_PHASE1_SCOPE.md Part A#2: needed so a Make/CRM user
// configuring a "create document" action gets a real dropdown of template
// names instead of having to go copy a UUID out of the dashboard by hand.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .select("id, name, page_count, created_at")
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("API v1: list templates failed", error);
    return NextResponse.json({ error: "Couldn't list templates." }, { status: 500 });
  }

  return NextResponse.json({ templates: data || [] });
}
