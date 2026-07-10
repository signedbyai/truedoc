import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { uploadToR2 } from "@/lib/r2";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB — plenty for a logo, keeps requests cheap
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);

// Uploads/replaces the org's signing-page logo (Business-tier "custom
// branding"). Overwrites the same R2 key each time rather than
// accumulating objects — orgs only ever need their current logo.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "customBranding")) {
    return NextResponse.json({ error: "Custom branding requires the Business plan.", upgrade: true }, { status: 402 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Logo must be a PNG, JPEG, WebP, or SVG image." }, { status: 400 });
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Logo must be under 2MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `org-logos/${orgId}/logo`;

  try {
    await uploadToR2(key, bytes, file.type);
  } catch (err) {
    console.error("Logo upload failed", err);
    return NextResponse.json({ error: "Upload failed. Check R2 credentials." }, { status: 500 });
  }

  const { error } = await supabase.from("organizations").update({ logo_url: key }).eq("id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
