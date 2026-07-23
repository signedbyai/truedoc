"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { CtaColor } from "@/flags";

// Color classes for the CTA experiment: yellow / blue / purple, concurrent.
// purple is violet-500 (#8B5CF6) — lightened 2026-07-23 per explicit
// request, matching BoloSign's own CTA color (see the competitor table in
// marketing/cta-color-test.md). Originally purple-700 specifically to stay
// distinct from BoloSign; superseded by that request.
const COLOR_CLASSES: Record<CtaColor, string> = {
  yellow: "bg-yellow-300 text-slate-900 hover:bg-yellow-400",
  blue: "bg-blue-600 text-white hover:bg-blue-700",
  purple: "bg-violet-500 text-white hover:bg-violet-600",
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
