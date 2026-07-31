import Link from "next/link";
import Image from "next/image";
import { getUserAndOrg } from "@/lib/org";
import { isDevAccessAllowed } from "@/lib/dev-access";
import { ConsoleBodyBackground } from "@/components/console-body-background";

// Console's own shell — deliberately NOT nested under app/dashboard/, so it
// does not inherit DashboardNav (the tab bar/pill used by the rest of the
// product). Michael's direction (2026-07-30): make the console feel like a
// separate "control zone" rather than just another dashboard page, closer
// to how console.anthropic.com is a structurally distinct app from
// claude.ai. First cut was a same-deployment route change only
// (/console/app); same day, after testing, upgraded to the real thing —
// console.signedby.ai now serves this whole shell as its own subdomain
// (see src/middleware.ts's "/app" rewrite and src/lib/console-host.ts).
// This file's route is still physically /console/app internally, reached
// at console.signedby.ai/app externally.
//
// Chrome is intentionally minimal: logo top-left (links back to the main
// app) plus an explicit text link doing the same. Background is
// bg-neutral-950 (2026-07-31, direct reference: a screenshot of Claude's
// own chat interface — near-black/neutral rather than the marketing
// page's navy-tinted bg-slate-950) since this is the interactive app
// specifically, not the pitch page; slightly different shade from
// console.signedby.ai's marketing page by design, both still read as one
// dark product. Both links point at the absolute https://signedby.ai/dashboard rather
// than the relative /dashboard — a real jump off the console subdomain
// back to the main app's own home, not an internal route that happens to
// render there. Safe to do without forcing a second sign-in because the
// auth cookie is now scoped to all of *.signedby.ai (see cookie-domain.ts).
export default async function ConsoleAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserAndOrg();
  if (!ctx) return <>{children}</>;

  const { user } = ctx;

  // Same private-preview allowlist gate dashboard/layout.tsx enforces — a
  // no-op outside of DEV_ACCESS_ALLOWLIST being set (i.e. production today).
  if (!isDevAccessAllowed(user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
        <ConsoleBodyBackground />
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
    <div className="min-h-screen bg-neutral-950">
      <ConsoleBodyBackground />
      {/* Sticky (2026-07-31, direct feedback: "can i keep that at the top")
          — the page below now has a sidebar (history + usage panel) that
          can grow taller than the viewport, so the header needs to stay
          pinned rather than scroll away with it. bg-neutral-950 + a hairline
          border so it reads as a fixed bar once content scrolls under it,
          not just floating. max-w-6xl matches the page content's width
          (widened from max-w-5xl the same day, for the new sidebar). */}
      <header className="sticky top-0 z-20 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/5 bg-neutral-950 px-6 py-5">
        <Link href="https://signedby.ai/dashboard" className="flex items-center gap-3">
          {/* White-on-clear lockup, the real asset (2026-07-31): found in
              brand-assets/lockup/micro-small/ after Michael flagged this
              file wasn't being used — a code-recreated version was drawn
              in-place here first because /public/brand only had the
              black-wordmark/yellow-badge PNGs, made for light backgrounds.
              Swapped to the actual white-knockout PNG now that it's copied
              into /public/brand. */}
          <Image
            src="/brand/signedby-lockup-white-beta-micro-small-transparent.png"
            alt="SignedBy"
            width={266}
            height={64}
            className="h-6 w-auto"
            priority
          />
          <span className="rounded-full border border-yellow-300/35 bg-yellow-300/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-yellow-300">
            console
          </span>
        </Link>
        <Link href="https://signedby.ai/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
          ← Back to dashboard
        </Link>
      </header>
      {children}
    </div>
  );
}
