"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeNextPath } from "@/lib/safe-redirect";

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

  // Re-validated server-side (formData is client-controlled input, same as
  // any other form field) even though the page already sanitized it before
  // rendering the hidden input — see safe-redirect.ts.
  const next = sanitizeNextPath(String(formData.get("next") || ""));
  const emailRedirectTo = next
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });

  if (error) return { error: error.message };
  return { success: true };
}

// Verifies the 6-digit code from the same email signInWithOtp() sends
// (Magic Link and email OTP share one token — see the Magic Link email
// template comment in the Supabase dashboard). Separate rate-limit buckets
// from sendMagicLink's, since brute-forcing a 6-digit code is a fundamentally
// different attack shape (many guesses against one already-sent code)
// than spamming send requests.
export async function verifyLoginCode(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const token = String(formData.get("token") || "").trim();
  if (!email || !token) return { error: "Enter the 6-digit code." };

  const ip = await clientIp();
  const emailOk = await checkRateLimit(`login-otp-verify-email:${email.toLowerCase()}`, 10, 600);
  const ipOk = await checkRateLimit(`login-otp-verify-ip:${ip}`, 30, 600);
  if (!emailOk || !ipOk) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "That code is incorrect or has expired." };
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

// Password-based sign-UP was removed 2026-07-14 -- it sent Supabase's
// stock, unbranded "Confirm sign up" email (a plain confirmation link, no
// code), a completely separate template from the "Magic Link or OTP" one
// the rest of this app's copy and support conversations assume. A user who
// went through this path got no code and no explanation why, and reported
// it as "the email with the code never arrived" -- there was never a code
// to receive. The OTP flow (sendMagicLink, above) already handles a
// brand-new email address's first sign-in with no separate signup step
// needed, so this was pure redundant surface area, not a real second use
// case. Password sign-IN (signInWithPassword, below) and password reset
// stay, for anyone who still has a password-based account from before OTP
// existed.
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
