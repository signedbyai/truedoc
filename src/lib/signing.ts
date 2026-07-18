import { createAdminClient } from "@/lib/supabase/admin";
import { buildSpeedStat, type SpeedStat } from "@/lib/speed-stat";

type AdminClient = ReturnType<typeof createAdminClient>;

// Personal "you signed this in X seconds" stat for the completion screen.
// Best-effort by design: a signer's flow must never depend on it, so any
// failure resolves to null. Shared by the submit route (fresh signature),
// its idempotent replay path, and the status endpoint (recovery poll) so
// all three return the same stat.
export async function fetchSignerSpeedStat(admin: AdminClient, signerId: string): Promise<SpeedStat | null> {
  try {
    const { data: speedRows, error } = await admin.rpc("get_signer_speed_stat", { p_signer_id: signerId });
    if (error) throw error;
    const row = speedRows?.[0];
    return buildSpeedStat({
      activeSeconds: row?.active_seconds ?? null,
      percentile: row?.percentile ?? null,
      sampleSize: row?.sample_size ?? null,
    });
  } catch (err) {
    console.error("get_signer_speed_stat failed", err);
    return null;
  }
}

// Shared lookup for the signer-facing flow. The signer proves identity via
// an unguessable `signing_token` (no Supabase auth session), so every route
// here goes through the service-role admin client and bypasses RLS —
// access control is entirely "do you know the token."
export async function getSignerByToken(token: string) {
  const admin = createAdminClient();

  const { data: signer } = await admin
    .from("signers")
    .select("id, document_id, name, email, order_index, status, signed_at, docgate_code")
    .eq("signing_token", token)
    .single();

  if (!signer) return null;

  const { data: document } = await admin
    .from("documents")
    .select(
      "id, title, page_count, org_id, owner_id, status, payment_link_url, payment_label, docgate_url, docgate_label, open_notifications"
    )
    .eq("id", signer.document_id)
    .single();

  if (!document) return null;

  return { admin, signer, document };
}
