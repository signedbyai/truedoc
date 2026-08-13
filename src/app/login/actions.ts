"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeNextPath } from "@/lib/safe-redirect";
import { isDisposableEmailAddress } from "@/lib/disposable-email";
import { isFirstLogin } from "@/lib/first-login";
import { recordSignupOriginHost } from "@/lib/signup-origin";
import { storePendingAttribution, claimPendingAttribution } from "@/lib/pending-attribution";
import { isConsoleHost } from "@/lib/console-host";

/** Best-effort client IP from standard proxy headers — server actions don't get a Request object. */
async function clientIp() {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : hdrs.get("x-real-ip") || "unknown";
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter a valid email address." };

  // Disposable-domain block (CONSOLE_FREE_TIER_SCOPE.md's bot/abuse
  // mitigation, 2026-08-03 direct instruction) — this OTP flow is the one
  // real account-creation choke point in the app (there's no separate
  // sign-up step; a brand-new email's first successful code verification
  // creates the account, see the sendPasswordReset comment below for why
  // password sign-up was removed). Blocking here, before an OTP is even
  // sent, is the earliest and only place needed to stop a throwaway
  // address from ever getting an org — everything downstream (Free
  // console/API access, credit-pack purchases) requires a real account
  // first. Deliberately NOT applied to signer-facing emails or team
  // invites elsewhere in the app — those don't create SignedBy accounts by
  // themselves (an invited teammate still has to pass this same check when
  // they actually sign in), and blocking someone from merely being SENT a
  // document over a disposable address would be an unrelated UX
  // regression, not an abuse fix.
  //
  // Checked before the rate-limit calls below on purpose — no reason to
  // spend rate-limit budget validating a request that's getting rejected
  // either way.
  if (isDisposableEmailAddress(email)) {
    // Best-effort visibility (2026-08-05, direct ask) — this rejection was
    // previously invisible server-side, so there was no way to tell how
    // much of the signup funnel's CTA-click-to-account drop-off this
    // accounts for versus people just not clicking their magic link. Domain
    // only, not the full address — enough to spot which disposable
    // providers show up and how often, without logging a PII-bearing local
    // part for something that never became an account. Never blocks or
    // delays the rejection response below.
    const blockedDomain = email.split("@")[1]?.toLowerCase() || "unknown";
    const blockedIp = await clientIp();
    console.log("Signup blocked: disposable email domain", { domain: blockedDomain, ip: blockedIp });
    // Persisted (2026-08-06, direct ask: "show me how many logins blocked
    // as disposable emails" in the daily digest) — see
    // 0050_disposable_email_blocks.sql. Fresh admin client, same reasoning
    // as checkFreePlanCap's plan_cap_hits log: this server action runs on a
    // session-less/pre-account request, so there's no signed-in client with
    // insert rights here even if there were a policy for one. Awaited but
    // failure is swallowed — a logging hiccup must never block the real
    // rejection response below.
    try {
      await createAdminClient().from("disposable_email_blocks").insert({ domain: blockedDomain, ip: blockedIp });
    } catch (err) {
      console.error("Failed to log disposable email block", err);
    }
    return { error: "Please use a permanent email address — disposable or temporary email domains aren't supported." };
  }

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

  // First-touch attribution hand-off (2026-08-13, see
  // 0055_pending_attribution.sql). This is the last moment the ORIGINAL
  // browser — the one that actually landed on the ad and holds the
  // localStorage AttributionCapture wrote — is still in play. If they finish
  // via the magic link it will very likely open in a different browser
  // (Reddit in-app webview -> mail app -> Safari/Chrome) with no localStorage
  // to claim, so stash it server-side keyed by a hash of this address now and
  // let the first successful login pick it up.
  //
  // Only after the OTP send actually succeeded: no reason to stage
  // attribution for a request that never produced an email. Awaited rather
  // than fire-and-forget for the same reason recordSignupOriginHost is — a
  // detached promise risks being cut off when this action's response is sent
  // on Vercel's serverless runtime — but it can never fail the sign-in, since
  // storePendingAttribution swallows all its own errors.
  await storePendingAttribution(email, formData.get("attribution"));

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
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "That code is incorrect or has expired." };
  const firstLogin = isFirstLogin(data.user);
  // signedby.ai vs console.signedby.ai (2026-08-04, direct ask) — /login is
  // served unrewritten on both hosts (middleware.ts only rewrites "/" and
  // "/app"), so the Host header here reflects whichever one the person
  // actually signed up on. Only recorded on a genuine first login — see
  // recordSignupOriginHost's own doc comment for why this can't just reuse
  // getUserAndOrg() here. Awaited, not fire-and-forget — a detached promise
  // risks getting cut off once this action's response is sent on Vercel's
  // serverless runtime, and this is a single fast admin-client update, not
  // something worth risking silent data loss to shave off.
  if (firstLogin && data.user) {
    const originHost = isConsoleHost((await headers()).get("host")) ? "console.signedby.ai" : "signedby.ai";
    await recordSignupOriginHost(data.user.id, originHost);
    // Claims the row sendMagicLink staged for this address. On THIS path the
    // person never left the original browser (they typed the code instead of
    // clicking the link), so attribution-claim.tsx's localStorage read would
    // usually also work — this just makes the outcome identical either way,
    // and recordOrgAttribution is set-once so whichever lands first wins and
    // the other is a no-op.
    await claimPendingAttribution(data.user.id, data.user.email);
  }
  return { success: true, firstLogin };
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  const firstLogin = isFirstLogin(data.user);
  // See verifyLoginCode's matching comment — same reasoning applies here.
  if (firstLogin && data.user) {
    const originHost = isConsoleHost((await headers()).get("host")) ? "console.signedby.ai" : "signedby.ai";
    await recordSignupOriginHost(data.user.id, originHost);
  }
  return { success: true, firstLogin };
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
