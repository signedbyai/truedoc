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
}

export function CtaLink({ href, children, className, size = "lg", color, page, position }: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ size }), COLOR_CLASSES[color], className)}
      onClick={() => {
        track("cta_click", { page, position, color, href });
      }}
    >
      {children}
    </Link>
  );
}
