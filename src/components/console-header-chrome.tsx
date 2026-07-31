"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const MOBILE_QUERY = "(max-width: 1023px)"; // matches Tailwind's lg breakpoint, same cutoff console-workspace.tsx uses for its own mobile layout
const SWIPE_THRESHOLD_PX = 10; // ignores tiny jitter so a near-stationary touch doesn't flicker the header

/** The console shell's sticky header, split out of console/app/layout.tsx
 *  into its own client component (2026-07-31, direct ask) so it can
 *  auto-hide on mobile: swiping up (scrolling further into a conversation
 *  or the history sheet) hides it to give the chat more room, swiping
 *  down brings it back — the same pattern mobile Safari/Chrome use for
 *  their own address bar. Desktop is unaffected; the header always stays
 *  put there.
 *
 *  Listens on `document` rather than any specific scrollable element,
 *  because the actual scrolling on this page happens inside internal
 *  containers (the message thread, the history sheet) rather than the
 *  page itself (console-workspace.tsx bounds both columns to the viewport
 *  height) — a touchmove anywhere on the page still bubbles up to
 *  document, so this doesn't need to know which element is scrolling.
 *
 *  Stays forced-visible whenever the mobile history/settings sheet is
 *  open (console-workspace.tsx sets `document.body.dataset.consoleSheetOpen`
 *  while it is) so the nav doesn't vanish out from under someone mid-
 *  interaction with it. */
export function ConsoleHeaderChrome() {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);

    function onTouchStart(e: TouchEvent) {
      lastYRef.current = e.touches[0]?.clientY ?? null;
    }

    function onTouchMove(e: TouchEvent) {
      if (!mq.matches) return;
      if (document.body.dataset.consoleSheetOpen === "true") {
        setHidden(false);
        return;
      }
      const y = e.touches[0]?.clientY;
      const lastY = lastYRef.current;
      if (y == null || lastY == null) return;
      const delta = y - lastY; // positive = finger moving down the screen = "swipe down"
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      setHidden(delta < 0); // swipe up hides, swipe down shows
      lastYRef.current = y;
    }

    function onTouchEnd() {
      lastYRef.current = null;
    }

    function onMediaChange() {
      if (!mq.matches) setHidden(false); // never stay hidden once back on a desktop-width viewport
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    mq.addEventListener("change", onMediaChange);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      mq.removeEventListener("change", onMediaChange);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/5 bg-neutral-950 px-6 py-5 transition-transform duration-200 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
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
      <Link href="https://signedby.ai/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
        ← Back to dashboard
      </Link>
    </header>
  );
}
