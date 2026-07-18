import { Gift } from "lucide-react";
import { PRIZE_LABEL } from "@/lib/prize-draw";

// Progress toward the monthly gift-card draw, with terms in a popover.
//
// DELIBERATELY A SERVER COMPONENT, using a native <details> for the disclosure
// rather than useState. The first version was a client component, and that
// broke the whole point of the feature flag: even with PRIZE_ENABLED false and
// nothing rendered, the component was still in the static import graph, so the
// full unapproved prize terms shipped inside the dashboard's client JS chunk
// where anyone could read them. Verified by grepping .next/static.
//
// With no "use client", nothing here reaches the browser unless the server
// actually renders it — which it only does when the flag is on. <details> gives
// the open/close behaviour natively, and an absolutely-positioned child inside
// it keeps the popover feel without a line of JavaScript.
//
// The terms live here rather than on a separate page because they're short, and
// a prize you have to leave the page to understand mostly doesn't get
// understood. If they outgrow the popover, move them to /terms and link out.
export function PrizeDrawPill({
  count,
  threshold,
  qualified,
}: {
  count: number;
  threshold: number;
  qualified: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-slate-200 px-3.5 py-2">
      <Gift className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      {qualified ? (
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-900">You&apos;re in this month&apos;s draw</span> for a{" "}
          {PRIZE_LABEL}
        </p>
      ) : (
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-900">
            {count} of {threshold}
          </span>{" "}
          signatures this month — reach {threshold} to enter the draw for a {PRIZE_LABEL}
        </p>
      )}

      <details className="group relative ml-auto shrink-0">
        <summary className="cursor-pointer list-none text-xs font-medium text-slate-500 underline underline-offset-2 marker:content-none hover:text-slate-800">
          Terms
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-lg">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Monthly {PRIZE_LABEL} draw
          </h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600">
            <li>
              Each draw covers one calendar month and closes at 23:59 UTC on the last day of that
              month.
            </li>
            <li>
              A workspace enters by collecting signatures from {threshold} different recipients
              within that month. Only completed signatures count, and each recipient counts once
              however many documents they sign.
            </li>
            <li>
              One winner is selected at random from all qualifying workspaces after the month
              closes, and contacted by email at the workspace owner&apos;s address within 7 days.
            </li>
            <li>The prize is one {PRIZE_LABEL}. It cannot be exchanged for cash.</li>
            <li>
              One entry and one prize per workspace per month. Workspaces found to be creating
              signatures artificially are not eligible.
            </li>
            <li>
              SignedBy may change or end the promotion; workspaces that already qualify in the
              current month still stand.
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}
