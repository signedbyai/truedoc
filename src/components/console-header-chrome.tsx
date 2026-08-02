import Link from "next/link";
import Image from "next/image";

/** The console shell's sticky header, split out of console/app/layout.tsx
 *  into its own component (2026-07-31). Previously auto-hid on mobile
 *  swipe (swipe up to hide, swipe down to reveal, mirroring mobile Safari/
 *  Chrome's own address bar) — removed the same day per direct feedback:
 *  always visible now, on every viewport size, no swipe listener.
 *
 *  2026-08-02, direct ask: unified mobile's centered-pill layout onto
 *  desktop too, instead of desktop keeping its own inline-next-to-logo pill
 *  plus a separate "← Back to dashboard" text link on the right. The
 *  desktop sidebar's own floating pill (console-workspace.tsx) grew a Home
 *  icon back to the dashboard the same day, so this header's back-link was
 *  now a redundant second way back — removed outright. With nothing on the
 *  right anymore, plain CSS grid (3 equal columns, pill centered via
 *  justify-self-center) works at every breakpoint without needing flex's
 *  justify-between, which only balances an element on each end. Desktop's
 *  pill now reads the full "console.signedby.ai" host instead of just
 *  "console", since it's no longer squeezed in next to the logo. */
export function ConsoleHeaderChrome() {
  return (
    <header className="sticky top-0 z-20 mx-auto grid w-full max-w-6xl grid-cols-3 items-center border-b border-white/5 bg-neutral-950 px-6 py-5">
      <Link href="https://signedby.ai/dashboard" className="flex items-center gap-3">
        <Image
          src="/brand/signedby-lockup-white-beta-micro-small-transparent.png"
          alt="SignedBy"
          width={266}
          height={64}
          className="h-6 w-auto"
          priority
        />
      </Link>
      {/* Centered at every breakpoint now (2026-08-02) — "console" on
          mobile (narrow, no room for the full host), the full
          "console.signedby.ai" host on desktop, where there's space for it. */}
      <span className="justify-self-center rounded-full border border-yellow-300/35 bg-yellow-300/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-yellow-300">
        <span className="lg:hidden">console</span>
        <span className="hidden lg:inline">console.signedby.ai</span>
      </span>
    </header>
  );
}
