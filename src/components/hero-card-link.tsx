import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Shared "hero card" entry point for the four New document modes (Sign,
// Seal, Quote, Draft), used on the dashboard home and the Documents page as
// bigger, more discoverable alternatives to the existing New document
// button — not a replacement for it (2026-08-21, direct ask: cards sit
// alongside the existing buttons, nothing removed).
//
// The icon-badge/title/description layout is deliberately borrowed
// verbatim from the destination panels themselves inside
// new-document-client.tsx (same rounded-2xl bg-yellow-300 badge, same
// slate-900 icon, same icon per mode) — a card that visually previews the
// screen it leads to, rather than a new visual language of its own. No
// trailing arrow/chevron for the same reason: the panels this borrows from
// don't have one either.
export function HeroCardLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-300">
        <Icon className="h-5 w-5 text-slate-900" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
