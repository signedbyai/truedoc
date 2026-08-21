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
//
// Two-column at every width, not just sm+ (2026-08-21, direct ask — the
// pair stacking to one-per-row on a phone read as "increase the card
// size" rather than the intended compact side-by-side). Below sm the card
// switches to a centered icon-over-text layout instead of the roomier
// horizontal one — a horizontal layout squeezed into a ~170px column
// leaves the description only ~100px of text width and wraps to 4-5
// lines; stacking the icon on top gives the text the card's full width
// instead. At sm+ nothing changed: same horizontal layout, same sizes as
// before this pass.
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
      className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center transition hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-300 sm:h-12 sm:w-12">
        <Icon className="h-4 w-4 text-slate-900 sm:h-5 sm:w-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 sm:text-[15px]">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">{description}</p>
      </div>
    </Link>
  );
}
