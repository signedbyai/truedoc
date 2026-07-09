import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`waitlist:${ip}`, 5, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: parsed.data.email.toLowerCase().trim() });

  // Unique-constraint violation just means they already joined — treat as success.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
