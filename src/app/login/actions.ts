"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter a valid email address." };

  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : hdrs.get("x-real-ip") || "unknown";

  // Two nets: cap per-email (stop one inbox getting spammed) and per-IP
  // (stop one client from cycling through many emails).
  const emailOk = await checkRateLimit(`login-email:${email.toLowerCase()}`, 5, 600);
  const ipOk = await checkRateLimit(`login-ip:${ip}`, 15, 600);
  if (!emailOk || !ipOk) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return { success: true };
}
