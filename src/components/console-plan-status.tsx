import Link from "next/link";
import { PLAN_LABEL } from "@/lib/plan";

/** Bottom-left plan status box + pill for /console/app (2026-07-31, direct
 *  instruction) — always rendered, on every plan, regardless of whether
 *  console is locked or not. Sits last in console-workspace.tsx's flex-col
 *  sidebar so it naturally lands at the very bottom under whatever fills
 *  the rest of the column (history+usage when unlocked, the upgrade panel
 *  when locked). */
export function ConsolePlanStatus({ plan, hasAccess }: { plan: string; hasAccess: boolean }) {
  const label = PLAN_LABEL[plan] ?? "Free";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-300">Plan</p>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
            hasAccess ? "border-yellow-300/35 bg-yellow-300/10 text-yellow-300" : "border-white/15 bg-white/5 text-neutral-400"
          }`}
        >
          {label}
        </span>
      </div>
      {hasAccess ? (
        <Link
          href="https://signedby.ai/dashboard/billing"
          className="mt-2 inline-block text-xs text-neutral-500 underline hover:text-neutral-300"
        >
          Manage billing
        </Link>
      ) : (
        <Link
          href="https://signedby.ai/pricing"
          className="mt-2 inline-block text-xs font-medium text-yellow-300 underline hover:text-yellow-200"
        >
          Upgrade to unlock console →
        </Link>
      )}
    </div>
  );
}
