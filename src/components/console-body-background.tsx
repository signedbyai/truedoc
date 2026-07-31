"use client";

import { useEffect } from "react";

// SignedBy's body background is white globally (`background: var(--background)`
// in globals.css — MVP ships light-mode only, see the comment there).
// Console's own dark shell only colors its own wrapper divs
// (bg-neutral-950), so the real <body> element underneath stays white —
// invisible normally, but overscroll/rubber-band bounce (trackpad on
// Safari/Chrome, or the elastic scroll on iOS) briefly scrolls past the
// content and reveals that white body background as a flash at the top
// or bottom (2026-07-31, direct bug report).
//
// The <body> tag itself only exists in the root layout (src/app/layout.tsx),
// which every other (light-mode) page also uses — so this can't be a
// global CSS change without breaking every light page's own overscroll.
// Instead, this client component sets document.body's background directly
// on mount and restores it on unmount, scoped to whichever console routes
// render it (currently /console/app via its layout).
export function ConsoleBodyBackground() {
  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    // Matches Tailwind's neutral-950, the same shade console/app/layout.tsx
    // and console-chat.tsx already use for their own wrapper backgrounds.
    document.body.style.backgroundColor = "#0a0a0a";
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, []);

  return null;
}
