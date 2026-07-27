import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodySchema } from "./schema";

// Phase 1 of FIELD_SUGGESTION_LEARNING_SCOPE.md's field-suggestion
// correction logging. Sender-side, behind the existing dashboard auth
// (getUserAndOrg) -- no per-signer/document auth needed, since the row
// itself carries nothing to protect (no document/org/signer id, no text;
// see the migration for the full anonymization guarantee). field-editor.tsx
// posts to this on every suggested-field confirm/delete and every
// sender-placed field at persist() time; always fire-and-forget from the
// client (.catch(() => {})), so every response here is a no-op 200 rather
// than an error the client would need to react to -- this must never affect
// the editor experience.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ success: true });
  const { supabase, orgId } = ctx;

  // Generous relative to check-email-domain's 60/60s -- this can fire many
  // times per editing session (every suggestion confirm/delete/placement),
  // still nowhere near a real abuse concern given MAX_SUGGESTIONS caps each
  // document at 20 fields.
  const ok = await checkRateLimit(`suggestion-feedback:${orgId}`, 300, 60);
  if (!ok) return NextResponse.json({ success: true });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ success: true });

  // Dark per-org opt-out (2026-07-27, direct instruction) -- no UI anywhere
  // yet, toggled only via direct SQL (see migration 0036), same pattern as
  // ai_test_org. Checked here, server-side, rather than trusting the client
  // to simply not call this endpoint.
  const { data: org } = await supabase
    .from("organizations")
    .select("suggestion_feedback_opt_out")
    .eq("id", orgId)
    .single();
  if (org?.suggestion_feedback_opt_out) return NextResponse.json({ success: true });

  try {
    const admin = createAdminClient();
    await admin.from("suggestion_feedback").insert({
      origin: parsed.data.origin,
      field_type: parsed.data.fieldType,
      layout: parsed.data.layout,
      party_count: parsed.data.partyCount,
      column_count: parsed.data.columnCount,
      page_fraction_x: parsed.data.pageFractionX,
      page_fraction_y: parsed.data.pageFractionY,
      outcome: parsed.data.outcome,
      moved: parsed.data.moved,
      role_corrected: parsed.data.roleCorrected,
      delta_x: parsed.data.deltaX,
      delta_y: parsed.data.deltaY,
    });
  } catch (err) {
    console.error("suggestion_feedback insert failed", err);
  }

  return NextResponse.json({ success: true });
}
