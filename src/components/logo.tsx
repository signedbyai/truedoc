import { cn } from "@/lib/utils";

// Icon: a stylized "S" formed from an open loop crossed by a diagonal pen
// stroke (a small triangular nib marks the "pen tip"). Line-art only, no
// fill on the loop — mirrors the signature-in-motion mark chosen for the
// SignedBy brand.
export function Logo({ className, showBeta = true }: { className?: string; showBeta?: boolean }) {
  return (
    <span className={cn("inline-flex items-end gap-2", className)}>
      <svg width="30" height="30" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="signedby-logo-gradient" x1="6" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1e3a5f" />
            <stop offset="1" stopColor="#3b7ea1" />
          </linearGradient>
        </defs>
        <path
          d="M42 15C33 12 20 13 15 20C11 25 14 30 22 30C30 30 34 26 41 26C49 26 53 32 48 38C43 45 30 46 21 43"
          stroke="url(#signedby-logo-gradient)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M17 45L44 18" stroke="url(#signedby-logo-gradient)" strokeWidth="5" strokeLinecap="round" />
        <path d="M17 45L11 48.5L14.5 52L20 47Z" fill="url(#signedby-logo-gradient)" />
      </svg>

      <span className="inline-flex items-end gap-1.5">
        <span className="bg-gradient-to-br from-[#1e3a5f] to-[#3b7ea1] bg-clip-text text-xl font-semibold leading-none text-transparent">
          signedby.ai
        </span>
        {showBeta && (
          <span className="mb-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Beta
          </span>
        )}
      </span>
    </span>
  );
}
