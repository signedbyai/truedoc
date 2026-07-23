"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { CtaColor } from "@/flags";

// Color classes for the CTA experiment. yellow-vs-blue only for now — see
// src/flags.ts and marketing/cta-color-test.md for why "black" was dropped.
const COLOR_CLASSES: Record<CtaColor, string> = {
  yellow: "bg-yellow-300 text-slate-900 hover:bg-yellow-400",
  blue: "bg-blue-600 text-white hover:bg-blue-700",
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
