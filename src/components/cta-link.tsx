"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { CtaColor } from "@/flags";

// Color classes for the CTA experiment. "black" intentionally matches the
// `default` Button variant exactly — it's the no-accent-color control arm,
// answering "does yellow itself help or hurt" rather than just "which
// accent color wins."
const COLOR_CLASSES: Record<CtaColor, string> = {
  yellow: "bg-yellow-300 text-slate-900 hover:bg-yellow-400",
  blue: "bg-blue-600 text-white hover:bg-blue-700",
  black: "bg-slate-900 text-white hover:bg-slate-700",
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
