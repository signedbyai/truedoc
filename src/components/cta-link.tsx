"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { CtaColor } from "@/flags";

// Color classes for the CTA experiment: yellow / blue / purple, concurrent.
// purple is violet-600 (#7C3AED) — a middle ground settled on 2026-07-23:
// one step darker than BoloSign's own CTA color (violet-500, #8B5CF6, see
// the competitor table in marketing/cta-color-test.md) but lighter than
// the original purple-700 (#7E22CE) pick, which read as too strong.
const COLOR_CLASSES: Record<CtaColor, string> = {
  yellow: "bg-yellow-300 text-slate-900 hover:bg-yellow-400",
  blue: "bg-blue-600 text-white hover:bg-blue-700",
  purple: "bg-violet-600 text-white hover:bg-violet-700",
};

interface CtaLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg";
  color: CtaColor;
  /** Which page this CTA lives on, e.g. "magic-quote", "homepage". */
  page: string;
  /** Which spot on the page, e.g. "hero", "footer". */
  position: string;
  /**
   * Optional — which layout/copy variant this CTA belongs to, for pages
   * running their own separate test alongside the CTA color one (e.g. the
   * homepage-variant flag in src/flags.ts: "current" vs "v20"). Same
   * belt-and-suspenders reasoning as `color` below: FlagValues already
   * annotates this event with the flag value automatically, but passing it
   * as a plain event property too means results don't depend solely on the
   * flags-in-DOM mechanism working correctly. Omitted entirely on pages with
   * no variant test running, so existing call sites don't need to change.
   */
  variant?: string;
}

export function CtaLink({ href, children, className, size = "lg", color, page, position, variant }: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ size }), COLOR_CLASSES[color], className)}
      onClick={() => {
        track("cta_click", { page, position, color, href, ...(variant ? { variant } : {}) });
      }}
    >
      {children}
    </Link>
  );
}
