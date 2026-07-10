"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

/** Best-effort client IP from standard proxy headers — server actions don't get a Request object. */
async function clientIp() {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : hdrs.get("x-real-ip") || "unknown";
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter a valid email address." };

  const ip = await clientIp();

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

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const ip = await clientIp();
  const emailOk = await checkRateLimit(`login-pw-email:${email.toLowerCase()}`, 8, 600);
  const ipOk = await checkRateLimit(`login-pw-ip:${ip}`, 20, 600);
  if (!emailOk || !ipOk) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { success: true };
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and a password." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const ip = await clientIp();
  const emailOk = await checkRateLimit(`signup-email:${email.toLowerCase()}`, 5, 600);
  const ipOk = await checkRateLimit(`signup-ip:${ip}`, 15, 600);
  if (!emailOk || !ipOk) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  // Supabase silently no-ops (no error, no email) for an email that's
  // already registered, so this generic message is accurate either way
  // without leaking whether the account already existed.
  return { success: true };
}

export async function sendPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email address." };

  const ip = await clientIp();
  const emailOk = await checkRateLimit(`pwreset-email:${email.toLowerCase()}`, 5, 600);
  const ipOk = await checkRateLimit(`pwreset-ip:${ip}`, 15, 600);
  if (!emailOk || !ipOk) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  // Doesn't error for a non-existent email either — same anti-enumeration
  // behavior as signUp, so the generic success message is safe here too.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: true };
}
