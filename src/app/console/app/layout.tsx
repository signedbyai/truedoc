import Link from "next/link";
import Image from "next/image";
import { getUserAndOrg } from "@/lib/org";
import { isDevAccessAllowed } from "@/lib/dev-access";

// Console's own shell — deliberately NOT nested under app/dashboard/, so it
// does not inherit DashboardNav (the tab bar/pill used by the rest of the
// product). Michael's direction (2026-07-30): make the console feel like a
// separate "control zone" rather than just another dashboard page, closer
// to how console.anthropic.com is a structurally distinct app from
// claude.ai — but as a same-deployment route change (not a full subdomain
// split) for now, per his own "let's see if this works before I revert to
// a fully separate subdomain" framing. If that reversal ever happens, this
// file is the thing that gets deleted in favor of routing
// console.signedby.ai's whole path space at the middleware level instead
// of just "/" (see src/middleware.ts's CONSOLE_HOST comment).
//
// Chrome is intentionally minimal: logo top-left (links back to
// /dashboard — "jump back into the main app" was the explicit ask) plus an
// explicit text link doing the same, dark bg-slate-950 to match the
// console.signedby.ai marketing page's 2026-07-30 redesign so the two dark
// surfaces (logged-out pitch, logged-in app) feel like one continuous
// product instead of a jarring light/dark handoff on sign-in.
export default async function ConsoleAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserAndOrg();
  if (!ctx) return <>{children}</>;

  const { user } = ctx;

  // Same private-preview allowlist gate dashboard/layout.tsx enforces — a
  // no-op outside of DEV_ACCESS_ALLOWLIST being set (i.e. production today).
  if (!isDevAccessAllowed(user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-100">Private preview</h1>
          <p className="mt-2 text-sm text-slate-400">
            This is a work-in-progress preview of SignedBy — access is limited to a testing
            allowlist. Email{" "}
            <a href="mailto:michael@signedby.ai" className="font-medium text-slate-200 underline">
              michael@signedby.ai
            </a>{" "}
            and ask him to add <span className="font-medium text-slate-200">{user.email}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="inline-flex rounded-md bg-white px-2 py-1">
            <Image
              src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
              alt="SignedBy"
              width={266}
              height={64}
              className="h-6 w-auto"
              priority
            />
          </span>
          <span className="rounded-full border border-yellow-300/35 bg-yellow-300/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-yellow-300">
            console
          </span>
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
          ← Back to dashboard
        </Link>
      </header>
      {children}
    </div>
  );
}
