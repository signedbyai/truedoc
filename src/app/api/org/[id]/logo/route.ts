import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2 } from "@/lib/r2";

// Public, unauthenticated proxy — org logos render on the signer-facing
// signing page, which has no session (signers only have a signing_token).
// Only ever serves what the org itself uploaded via /api/org/logo.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("logo_url").eq("id", id).single();
  if (!org?.logo_url) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { body, contentType } = await getFromR2(org.logo_url);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("Logo R2 fetch failed", err);
    return NextResponse.json({ error: "Could not load logo" }, { status: 500 });
  }
}
