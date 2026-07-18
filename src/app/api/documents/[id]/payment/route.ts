import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { bodySchema } from "./schema";

// Sets (or clears) the "pay me" link shown on this document's signing page —
// Business-tier "payment collection." Deliberately just an external link,
// not a Stripe Connect charge — see plan.ts for the tradeoff.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "paymentCollection")) {
    return NextResponse.json({ error: "Payment collection requires the Business plan.", upgrade: true }, { status: 402 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payment links must be a valid https:// URL." }, { status: 400 });
  }

  const { data: doc } = await supabase.from("documents").select("id, org_id").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { error } = await supabase
    .from("documents")
    .update({
      payment_link_url: parsed.data.payment_link_url || null,
      payment_label: parsed.data.payment_label || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
