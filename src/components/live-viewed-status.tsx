"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/last-viewed";

// Live "Viewing now" pill (V3 #7, the best idea on DocTrack's landing
// page): subscribes to document_page_views changes for one document over
// Supabase Realtime. The signer's engagement tracker flushes a ping every
// ~10s while they're actually reading (see lib/page-view-tracking.ts), so
// "viewing now" = a ping newer than VIEWING_NOW_WINDOW_MS; with no fresh
// pings the pill decays back to the static "Last viewed Xm ago".
//
// Only subscribes when `live` (the org's pageViewTracking entitlement,
// Starter+) — free orgs' signers never generate pings anyway (the view
// route no-ops), so for them this renders the static recency line and
// opens no socket. Requires migration 0020 (adds the table to the
// supabase_realtime publication); until that's applied the pill simply
// never fires and the static line still works.

export const VIEWING_NOW_WINDOW_MS = 30_000;

// 10s-quantized wall clock via useSyncExternalStore — the React-compiler-
// clean way to read "now" during render (Date.now() directly in render is
// flagged as impure). Emissions and quantization share the same 10s grain,
// so the snapshot is stable between renders; the server snapshot of 0
// makes SSR/hydration deterministic (static line first, pill after mount).
const CLOCK_GRAIN_MS = 10_000;
const subscribeClock = (cb: () => void) => {
  const id = window.setInterval(cb, CLOCK_GRAIN_MS);
  return () => window.clearInterval(id);
};
const getClockSnapshot = () => Math.floor(Date.now() / CLOCK_GRAIN_MS) * CLOCK_GRAIN_MS;
const getServerClockSnapshot = () => 0;

export function LiveViewedStatus({
  documentId,
  initialLastViewedAt,
  live,
}: {
  documentId: string;
  initialLastViewedAt: string | null;
  live: boolean;
}) {
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(initialLastViewedAt);
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);

  useEffect(() => {
    if (!live) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`doc-views-${documentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "document_page_views", filter: `document_id=eq.${documentId}` },
        (payload) => {
          const at = (payload.new as { last_viewed_at?: string } | null)?.last_viewed_at;
          if (!at) return;
          setLastViewedAt((prev) => (!prev || Date.parse(at) > Date.parse(prev) ? at : prev));
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [documentId, live]);

  if (!lastViewedAt) return null;

  const viewingNow = live && now > 0 && now - Date.parse(lastViewedAt) < VIEWING_NOW_WINDOW_MS;
  if (viewingNow) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-75 motion-reduce:animate-none"
            aria-hidden
          />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
        </span>
        Viewing now
      </span>
    );
  }
  return (
    <span className="text-xs text-slate-500">
      Last viewed {formatRelativeTime(lastViewedAt, new Date(now > 0 ? now : Date.parse(lastViewedAt)))}
    </span>
  );
}
