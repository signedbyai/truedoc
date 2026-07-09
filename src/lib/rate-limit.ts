import { createAdminClient } from "@/lib/supabase/admin";

// Fixed-window rate limiter backed by the rate_limits table (see migration
// 0006). Deliberately not Redis/Upstash — Postgres we already have is fine
// at MVP volumes, and it avoids another account/env var to manage.
//
// Returns true if the request is allowed, false if it should be rejected.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const admin = createAdminClient();
  const bucketMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / bucketMs) * bucketMs).toISOString();

  const { data: count, error } = await admin.rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart,
  });

  if (error) {
    // Fail open — a rate-limiter outage shouldn't take down the product.
    console.error("Rate limit check failed", error);
    return true;
  }

  return (count ?? 0) <= limit;
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
