import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";

const bodySchema = z.object({ name: z.string().trim().min(1).max(200) });

// Saves the current field layout as a reusable template. Fields are stored
// with a generic 0-based "role" (recipient slot) instead of a real signer_id
// — role 0 is whichever signer was added first in this document, role 1 the
// second, and so on — so the template can be reused with any set of
// recipients later. The source PDF itself is reused (base_file_path points
// at the same R2 object) rather than copied, since the original upload is
// never mutated after creation.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Give the template a name." }, { status: 400 });
  }

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!planHasFeature(org?.plan, "templates")) {
    return NextResponse.json(
      { error: "Templates are a Starter plan feature. Upgrade to save documents as templates.", upgrade: true },
      { status: 402 }
    );
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, org_id, file_path, page_count, payment_link_url, payment_label, docgate_url, docgate_label")
    .eq("id", id)
    .single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: signers } = await supabase
    .from("signers")
    .select("id, order_index")
    .eq("document_id", id)
    .order("order_index", { ascending: true });

  const roleBySignerId = new Map<string, number>();
  (signers || []).forEach((s, i) => roleBySignerId.set(s.id, i));

  const { data: fields } = await supabase
    .from("document_fields")
    .select("type, page, x, y, width, height, required, signer_id, template_role")
    .eq("document_id", id)
    .order("created_at", { ascending: true });

  if (!fields || fields.length === 0) {
    return NextResponse.json({ error: "Place at least one field before saving as a template." }, { status: 400 });
  }

  const fieldMap = fields.map((f) => ({
    type: f.type,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    required: f.required,
    // Bug found 2026-07-30 via CRM Phase 1 smoke testing: a field with no
    // signer_id isn't necessarily generic/unassigned -- it may still be a
    // pending "Party N" slot (template_role set) that was never claimed by
    // adding a recipient to THIS document (e.g. a document created via "Use
    // template" and saved again as a template without ever adding
    // recipients). Falling straight to `null` here silently dropped that
    // role tag, producing a template whose editor still showed "Party 1/2"
    // labels but whose actual field_map had role: null everywhere -- which
    // then made every field invisible on any 2+-signer send (see
    // field-visibility.ts: an unassigned field only falls back to "show
    // it anyway" when there's exactly one signer). Falling back to the
    // field's own template_role preserves that pending tag instead of
    // discarding it.
    role: f.signer_id ? roleBySignerId.get(f.signer_id) ?? null : f.template_role ?? null,
  }));

  const { data: template, error } = await supabase
    .from("templates")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      base_file_path: doc.file_path,
      page_count: doc.page_count,
      field_map: fieldMap,
      payment_link_url: doc.payment_link_url,
      payment_label: doc.payment_label,
      docgate_url: doc.docgate_url,
      docgate_label: doc.docgate_label,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Save as template failed", error);
    return NextResponse.json({ error: "Couldn't save as a template." }, { status: 500 });
  }

  return NextResponse.json({ id: template.id });
}
