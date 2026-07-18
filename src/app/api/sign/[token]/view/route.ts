import { NextResponse } from "next/server";
import { getSignerByToken } from "@/lib/signing";
import { planHasFeature } from "@/lib/plan";
import { bodySchema } from "./schema";

// Best-effort, fire-and-forget page-view/dwell-time reporting from the
// signing-view client (src/lib/page-view-tracking.ts builds the deltas;
// signing-view.tsx flushes them here roughly every 10s, on tab-hide, and
// on unload) — never blocks or affects the signer's actual experience.
// Mirrors payment-click/route.ts's shape: same token-only access control,
// same "swallow, don't surface" error posture.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: org } = await admin.from("organizations").select("plan").eq("id", document.org_id).single();

  // Not entitled to this feature -- no-op rather than an error, since the
  // sending org's plan tier must never be visible to (or affect) the
  // signer's own experience. The client still thinks the beacon succeeded.
  if (!planHasFeature(org?.plan, "pageViewTracking")) {
    return NextResponse.json({ success: true });
  }

  for (const { page, seconds } of parsed.data.deltas) {
    const { error } = await admin.rpc("increment_page_view", {
      p_document_id: document.id,
      p_signer_id: signer.id,
      p_page: page,
      p_seconds: seconds,
    });
    // Best-effort: one bad delta in a batch (e.g. a transient DB hiccup)
    // shouldn't block the rest, and none of this should ever surface an
    // error to the signer.
    if (error) console.error("increment_page_view failed", error);
  }

  return NextResponse.json({ success: true });
}
