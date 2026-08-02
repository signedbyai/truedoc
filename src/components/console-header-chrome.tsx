import Link from "next/link";
import Image from "next/image";

/** The console shell's sticky header, split out of console/app/layout.tsx
 *  into its own component (2026-07-31). Previously auto-hid on mobile
 *  swipe (swipe up to hide, swipe down to reveal, mirroring mobile Safari/
 *  Chrome's own address bar) — removed the same day per direct feedback:
 *  always visible now, on every viewport size, no swipe listener.
 *
 *  2026-08-02, direct ask (three passes the same day): started as desktop
 *  keeping its own inline-next-to-logo pill plus a separate
 *  "← Back to dashboard" text link on the right. The desktop sidebar's own
 *  floating pill (console-workspace.tsx) grew a Home icon back to the
 *  dashboard the same day, so this header's back-link became a redundant
 *  second way back — removed outright. Pass two unified mobile's centered
 *  pill layout onto desktop too. Pass three (this one): desktop's pill
 *  moved again, off-center to the right edge of the bar — mobile's pill
 *  stays centered, unchanged, only desktop's placement moved a second time.
 *  Still one plain CSS grid (3 equal columns) at every breakpoint: mobile
 *  keeps the pill in the middle column with justify-self-center, desktop
 *  reassigns it into the third column with lg:justify-self-end via
 *  lg:col-start-3 — no flex, no absolute positioning, just moving which
 *  grid column the same element sits in per breakpoint. Desktop's pill
 *  still reads the full "console.signedby.ai" host; mobile still reads
 *  just "console". */
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
      {/* Centered on mobile (middle column), right-aligned on desktop (third
          column) — "console" on mobile (narrow, no room for the full host),
          the full "console.signedby.ai" host on desktop, where there's
          space for it. */}
      <span className="col-start-2 justify-self-center rounded-full border border-yellow-300/35 bg-yellow-300/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-yellow-300 lg:col-start-3 lg:justify-self-end">
        <span className="lg:hidden">console</span>
        <span className="hidden lg:inline">console.signedby.ai</span>
      </span>
    </header>
  );
}
