import Link from "next/link";
import Image from "next/image";

/** The console shell's sticky header, split out of console/app/layout.tsx
 *  into its own component (2026-07-31). Previously auto-hid on mobile
 *  swipe (swipe up to hide, swipe down to reveal, mirroring mobile Safari/
 *  Chrome's own address bar) — removed the same day per direct feedback:
 *  always visible now, on every viewport size, no swipe listener. */
export function ConsoleHeaderChrome() {
  return (
    <header className="sticky top-0 z-20 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/5 bg-neutral-950 px-6 py-5">
      <Link href="https://signedby.ai/dashboard" className="flex items-center gap-3">
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
      {/* Hidden on mobile (2026-08-01, direct ask) — the floating pill's
          Home button (console-workspace.tsx) already covers this there;
          kept for `lg:` and up, where that pill is hidden in favor of the
          desktop sidebar and this link is the only way back. */}
      <Link href="https://signedby.ai/dashboard" className="hidden text-sm font-medium text-slate-400 hover:text-white lg:block">
        ← Back to dashboard
      </Link>
    </header>
  );
}
