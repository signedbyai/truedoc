import { cn } from "@/lib/utils";

// SignedBy brand mark: the "SignedBy" wordmark with an optional BETA tag. Keep
// this the single source of the lockup — headers should use <Logo/>, not
// hand-rolled SignedBy spans, so a future brand tweak lands everywhere at once.

export function Logo({
  withBeta = true,
  className,
}: {
  withBeta?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-baseline gap-1.5", className)}>
      <span className="text-lg font-bold tracking-tight text-slate-900">SignedBy</span>
      {withBeta && <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Beta</span>}
    </span>
  );
}
