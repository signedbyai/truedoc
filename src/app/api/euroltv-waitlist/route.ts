import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Lead-capture endpoint for euroltv.eu's waitlist page (EuroLTV, EuroTSA's
// Phase 2 long-term-validity service per EUROLTV_SCOPE.md) -- mirrors
// /api/eurotsa-waitlist exactly. euroltv.eu is planned as a standalone
// static site on its own Hetzner VM, not part of this Next.js app, so it
// POSTs here across origins rather than having its own backend, same as
// eurotsa.eu.
//
// Deliberately minimal: no accounts, no confirmation email, no dedup logic
// beyond a unique index on lower(email) (migration 0058) -- a waitlist,
// not an account system. Never reveals whether an email already exists
// (same response either way) so this can't be used to enumerate signups
// from the public internet.
const ALLOWED_ORIGINS = new Set(["https://euroltv.eu"]);

const bodySchema = z.object({
  email: z.string().email(),
  // Free text the calling page sets itself -- see the source column's
  // comment in the migration. Capped short since it's unauthenticated
  // input from outside this repo.
  source: z.string().max(40).optional(),
});

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  // Same shape as eurotsa_waitlist's rate limit -- this is public,
  // unauthenticated, cross-origin input, so an IP-keyed limit is the only
  // option (no session to key off).
  const ip = getClientIp(request);
  const ok = await checkRateLimit(`euroltv_waitlist:${ip}`, 5, 3600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400, headers });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("euroltv_waitlist").insert({
    email: parsed.data.email.toLowerCase(),
    source: parsed.data.source ?? null,
    ip,
  });

  // Unique-violation on a repeat signup is treated as success (23505) --
  // never confirm/deny whether an address is already on the list to an
  // unauthenticated caller.
  if (error && error.code !== "23505") {
    console.error("euroltv_waitlist insert failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again shortly." }, { status: 500, headers });
  }

  return NextResponse.json({ ok: true }, { headers });
}
