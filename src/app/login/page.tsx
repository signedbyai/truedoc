"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import { sendMagicLink, signInWithPassword, sendPasswordReset, verifyLoginCode } from "./actions";

type AuthView = "email" | "password";
// "signup" was removed 2026-07-14 -- see actions.ts's comment above
// sendPasswordReset for why. Password sign-in (for pre-existing password
// accounts) and password reset both remain.
type PasswordMode = "signin" | "forgot";

// Google's official multi-color "G" mark — used at icon size for the social
// sign-in button, per Google's branding guidelines for "Sign in with Google".
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 010-4.54V6.62H1.27a12 12 0 000 10.76l4-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

// Microsoft's four-color square mark — used at icon size for the social
// sign-in button, per Microsoft's identity branding guidelines.
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

// Slim wrapper so useSearchParams (client-only) doesn't block static
// rendering of the rest of the page — Next requires a Suspense boundary
// around any component that reads the search string.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

// OAuth failures (wrong provider config, provider not returning an email,
// etc.) come back from Supabase as a URL hash fragment on this same page
// (e.g. #error=server_error&error_description=...), not a query param — and
// hash fragments are never sent to the server, so our own /auth/callback
// route can't see or forward them. Without this, a failed Google/Microsoft
// sign-in silently dumps the user back on this page with zero explanation.
function readOAuthErrorFromHash(): string | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const description = params.get("error_description");
  return description ? description.replace(/\+/g, " ") : null;
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const isSignup = searchParams.get("intent") === "signup";

  const [view, setView] = useState<AuthView>("email");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signin");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">(() => (readOAuthErrorFromHash() ? "error" : "idle"));
  const [message, setMessage] = useState(() => readOAuthErrorFromHash() ?? "");
  const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | null>(null);

  // The email we sent the code/link to -- kept separately from the form so
  // "Resend code" and the verify call both work without re-reading the
  // (now-hidden) input.
  const [sentEmail, setSentEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [resendNotice, setResendNotice] = useState("");
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Strip the error out of the URL once rendered so a refresh doesn't keep
  // re-showing a stale error. This only touches browser history (an
  // external system), not component state, so it belongs in an effect.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  function resetStatus() {
    setStatus("idle");
    setMessage("");
  }

  function switchView(next: AuthView) {
    setView(next);
    setPasswordMode("signin");
    resetStatus();
  }

  function switchPasswordMode(next: PasswordMode) {
    setPasswordMode(next);
    resetStatus();
  }

  function handleMagicLink(formData: FormData) {
    const email = String(formData.get("email") || "").trim();
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setSentEmail(email);
        setOtpDigits(Array(6).fill(""));
        setResendNotice("");
        setStatus("sent");
      }
    });
  }

  function handleVerifyCode(token: string) {
    if (token.length !== 6 || isPending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", sentEmail);
      fd.set("token", token);
      const result = await verifyLoginCode(fd);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
        setOtpDigits(Array(6).fill(""));
        otpRefs.current[0]?.focus();
      } else {
        window.location.href = "/dashboard";
      }
    });
  }

  function handleResendCode() {
    const fd = new FormData();
    fd.set("email", sentEmail);
    startTransition(async () => {
      const result = await sendMagicLink(fd);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setOtpDigits(Array(6).fill(""));
        setResendNotice("Sent — check your inbox.");
        otpRefs.current[0]?.focus();
      }
    });
  }

  function handleOtpChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index === 5 && next.every((d) => d)) {
      handleVerifyCode(next.join(""));
    } else if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setOtpDigits(next);
    if (digits.length === 6) {
      handleVerifyCode(digits);
    } else {
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  }

  function handlePasswordSignIn(formData: FormData) {
    startTransition(async () => {
      const result = await signInWithPassword(formData);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        window.location.href = "/dashboard";
      }
    });
  }

  function handleForgotPassword(formData: FormData) {
    startTransition(async () => {
      const result = await sendPasswordReset(formData);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("sent");
        setMessage("Check your inbox for a password reset link.");
      }
    });
  }

  async function handleOAuth(provider: "google" | "azure") {
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setOauthLoading(null);
      setStatus("error");
      setMessage(error.message);
    }
    // On success the browser navigates away to the provider, so no further state change needed.
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-3">
        <Logo withBeta={false} />
      </Link>
      <span className="mb-8 inline-block -rotate-1 rounded bg-yellow-300 px-1.5 py-0.5 text-sm font-semibold text-slate-900">
        Sign documents.
      </span>

      <div className="w-full max-w-sm rounded-xl border border-slate-200/60 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup ? "Free to start — no credit card required." : "Sign in to continue to SignedBy."}
          </p>
        </div>

        {view === "email" ? (
          <div className="space-y-4">
            {sentEmail ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-slate-600">
                  We sent a code to <span className="font-medium text-slate-900">{sentEmail}</span>. Enter it below,
                  or click the sign-in link in that same email.
                </p>
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      disabled={isPending}
                      aria-label={`Digit ${i + 1} of 6`}
                      className="h-12 w-10 rounded-md border border-slate-300 text-center text-lg font-semibold text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-50"
                    />
                  ))}
                </div>
                {isPending && <p className="text-center text-xs text-slate-400">Verifying…</p>}
                {status === "error" && <p className="text-center text-sm text-red-600">{message}</p>}
                {resendNotice && <p className="text-center text-xs text-emerald-600">{resendNotice}</p>}
                <p className="text-center text-xs text-slate-500">
                  Didn&apos;t get it?{" "}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isPending}
                    className="underline underline-offset-2 disabled:opacity-50"
                  >
                    Resend code
                  </button>{" "}
                  ·{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSentEmail("");
                      setResendNotice("");
                      resetStatus();
                    }}
                    className="underline underline-offset-2"
                  >
                    Use a different email
                  </button>
                </p>
              </div>
            ) : (
              <form action={handleMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <Input id="email" name="email" type="email" required placeholder="Email address" />
                </div>
                {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Sending…" : "Continue with email"}
                </Button>
              </form>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={oauthLoading !== null}
                aria-label="Continue with Google"
                title="Continue with Google"
                className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <GoogleIcon />
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("azure")}
                disabled={oauthLoading !== null}
                aria-label="Continue with Microsoft"
                title="Continue with Microsoft"
                className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <MicrosoftIcon />
              </button>
            </div>

            <p className="text-center text-xs text-slate-500">
              <button type="button" onClick={() => switchView("password")} className="underline underline-offset-2">
                Use a password instead
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => switchView("email")}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              ← Use email link instead
            </button>

            {passwordMode === "signin" && (
              <form action={handlePasswordSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-email">Email</Label>
                  <Input id="pw-email" name="email" type="email" required placeholder="you@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-password">Password</Label>
                  <Input id="pw-password" name="password" type="password" required placeholder="Your password" />
                </div>
                {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Signing in…" : "Sign in"}
                </Button>
                <div className="flex justify-end text-xs text-slate-500">
                  <button type="button" onClick={() => switchPasswordMode("forgot")} className="underline underline-offset-2">
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {passwordMode === "forgot" && (
              <form action={handleForgotPassword} className="space-y-4">
                {status === "sent" ? (
                  <p className="text-sm text-slate-600">{message}</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="fp-email">Email</Label>
                      <Input id="fp-email" name="email" type="email" required placeholder="you@company.com" />
                    </div>
                    {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? "Sending…" : "Send reset link"}
                    </Button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => switchPasswordMode("signin")}
                  className="text-xs text-slate-500 underline underline-offset-2"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-slate-900 underline underline-offset-2">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to SignedBy?{" "}
            <Link href="/login?intent=signup" className="font-medium text-slate-900 underline underline-offset-2">
              Sign up free
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
