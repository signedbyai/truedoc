"use client";

import { useState } from "react";
import Link from "next/link";
import { History, Home, Settings, X } from "lucide-react";
import type { ConsoleBillingState } from "@/lib/console-usage";
import { ConsoleChat, type Bubble } from "@/components/console-chat";
import { ConsoleUsagePanel } from "@/components/console-usage-panel";
import { ConsoleHistorySidebar } from "@/components/console-history-sidebar";
import { ConsolePlanStatus } from "@/components/console-plan-status";
import { ConsoleUpgradePanel, ConsoleLockedChat } from "@/components/console-upgrade-panel";

/** Top-level client wrapper for /console/app (2026-07-31 layout pass) —
 *  owns the state that has to be shared between the history sidebar and
 *  the chat pane: which conversation is active, and a `resetKey` used to
 *  force ConsoleChat to remount with fresh initial messages whenever the
 *  user explicitly switches conversations (as opposed to autosave quietly
 *  adopting a freshly-created id mid-conversation, which must NOT remount
 *  — see handleSaved below).
 *
 *  Layout: a left sidebar (history list on top, usage/billing panel
 *  pinned at the bottom) next to the chat pane, replacing the previous
 *  chat-left/usage-right two-column grid — direct instruction, 2026-07-31.
 *
 *  Both columns are bounded to the viewport height (`h-[calc(100vh-8rem)]`,
 *  matching the layout's sticky header + this page's own padding) at every
 *  breakpoint, not just `lg:` — so the page itself doesn't grow taller than
 *  the viewport and each column scrolls internally instead. This is what
 *  makes ConsoleChat's input bar read as "floating": it's the last item in
 *  a bounded flex column, so it never moves, and message content scrolls
 *  underneath it rather than pushing it down the page (2026-07-31, direct
 *  feedback — also fixes a white-flash-on-overscroll complaint, since the
 *  outer page rarely has any real scroll distance left to rubber-band).
 *
 *  Pro-gate (2026-07-31, direct instruction): a plan status box + pill
 *  always sits at the very bottom of the left column, on every plan. When
 *  the org lacks console access (below Pro), the OTHER left-hand boxes
 *  (history + usage panel) are replaced by ConsoleUpgradePanel, and the
 *  chat pane itself is replaced by ConsoleLockedChat — console genuinely
 *  doesn't work below Pro, so ConsoleChat is never even mounted in that
 *  case (on top of /api/console/chat independently 402ing a Free org).
 *
 *  Mobile (2026-07-31, direct ask): below `lg:` the left column (history +
 *  usage/upgrade + plan status) is hidden from normal layout — it used to
 *  just stack above the chat pane, meaning you had to scroll an entire
 *  extra screen's worth of content before reaching the chat at all — and
 *  is instead reachable through an explicit "History" button (always
 *  visible, not gesture-only) that opens it as a bottom sheet over the
 *  chat. (The header used to also auto-hide on mobile swipe while this
 *  sheet was closed, coordinated via a `document.body` dataset flag set
 *  here — removed same-day per direct feedback; the header is now always
 *  visible, so that coordination is gone too.) */
export function ConsoleWorkspace({
  plan,
  hasAccess,
  initialState,
  initialCapEnabled,
  initialCapCents,
  showIntro,
  certificateModePreference,
}: {
  plan: string;
  hasAccess: boolean;
  initialState: ConsoleBillingState | null;
  initialCapEnabled: boolean;
  initialCapCents: number;
  showIntro: boolean;
  /** Org's Settings preference for Verified Badge's certificate question —
   *  threaded straight through to ConsoleChat. See that component's own
   *  prop doc for what each value does. */
  certificateModePreference: "ask" | "appended" | "separate" | "both";
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Bubble[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [loadingConversation, setLoadingConversation] = useState(false);
  // Mobile bottom sheet (history + usage/upgrade + plan status) — see the
  // "Mobile" doc comment above. `everOpened` lazily mounts the sheet's
  // contents the first time it's opened rather than on initial page load,
  // so ConsoleHistorySidebar's fetch doesn't fire twice (once for the
  // hidden desktop aside, once for the sheet) on a fresh mobile visit
  // that never opens it; once opened, it stays mounted so the closing
  // slide-down animation has something to animate.
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  // Which half of `sidebarBody` the sheet shows (2026-08-01, direct ask: the
  // old single "History & settings" bar became a compact pill with three
  // separate entry points — History and Settings now open the same sheet
  // scrolled to, and titled after, the relevant section instead of always
  // showing everything at once).
  const [mobileSheetTab, setMobileSheetTab] = useState<"history" | "settings">("history");

  function openMobileSheet(tab: "history" | "settings") {
    setEverOpened(true);
    setMobileSheetTab(tab);
    setMobileSheetOpen(true);
  }

  async function handleSelect(id: string) {
    if (id === activeId || loadingConversation) return;
    setLoadingConversation(true);
    try {
      const res = await fetch(`/api/console/conversations/${id}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.messages)) {
        setInitialMessages(data.messages);
        setActiveId(id);
        setResetKey((k) => k + 1);
        setMobileSheetOpen(false); // picking a chat from the mobile sheet should also close it
      }
    } finally {
      setLoadingConversation(false);
    }
  }

  function handleNewChat() {
    setMobileSheetOpen(false);
    if (activeId === null && initialMessages.length === 0) return; // already a blank new chat
    setActiveId(null);
    setInitialMessages([]);
    setResetKey((k) => k + 1);
  }

  // Adopts a freshly-created (or just-updated) conversation id WITHOUT
  // remounting ConsoleChat — this fires mid-conversation, from inside the
  // chat's own autosave effect, and remounting here would wipe out the
  // very state that just got saved.
  function handleSaved(id: string) {
    setActiveId((cur) => cur ?? id);
    setHistoryRefreshToken((t) => t + 1);
  }

  // Shared between the desktop aside and the mobile bottom sheet — same
  // history/usage(-or-upgrade)/plan-status stack either way, see the
  // "Mobile" doc comment above. The desktop aside stays mounted (just
  // `hidden` via CSS) below `lg:`, so on a phone that opens the sheet
  // there are briefly two ConsoleHistorySidebar instances (one invisible)
  // each fetching once — a real but minor duplicate GET, traded here for
  // not needing a matchMedia-driven "which one is actually visible" hook
  // just to dodge one small extra request.
  // Split into two halves so the mobile sheet can show just one at a time
  // (see `mobileSheetTab` above) while the desktop aside below still stacks
  // both together, unchanged.
  const historyBody = hasAccess ? (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ConsoleHistorySidebar activeId={activeId} onSelect={handleSelect} onNewChat={handleNewChat} refreshToken={historyRefreshToken} />
    </div>
  ) : (
    <ConsoleUpgradePanel />
  );
  const settingsBody = (
    <>
      {hasAccess && initialState && (
        <ConsoleUsagePanel
          initialState={initialState}
          initialCapEnabled={initialCapEnabled}
          initialCapCents={initialCapCents}
          showIntro={showIntro}
        />
      )}
      <ConsolePlanStatus plan={plan} hasAccess={hasAccess} />
    </>
  );
  const sidebarBody = (
    <>
      {historyBody}
      {settingsBody}
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      {/* Desktop/tablet sidebar — hidden below `lg:` in favor of the
          "History" button + bottom sheet below (2026-07-31, direct ask:
          this used to just stack above the chat on mobile, forcing a
          full-screen scroll before you ever reached the chat itself). */}
      <aside className="hidden h-[calc(100vh-8rem)] flex-col gap-4 lg:flex lg:sticky lg:top-24">{sidebarBody}</aside>

      <div className="flex h-[calc(100vh-8rem)] flex-col gap-2">
        {/* Chat pane + the mobile pill overlaid on top of it (relative
            ancestor for the pill's absolute positioning below), instead of
            the pill living in normal flow as its own row above this div —
            that read as a solid bar under the nav rather than a floating
            chip (2026-08-01, direct follow-up). No reserved top padding
            for it, either — an earlier pass added one so the pill would
            never cover the first message, but a permanent gap of the same
            solid background reads exactly like the bar it was meant to
            replace. Matches ConsoleChat's own "jump to latest" button,
            which reserves no space either: it just floats over whatever's
            scrolled underneath it, content included. */}
        <div className="relative min-h-0 flex-1">
          {/* Mobile-only access point for dashboard/history/usage/plan
              (2026-07-31, direct ask for a real always-visible entry point,
              not something only reachable through a swipe gesture;
              2026-08-01, direct ask to shrink the full-width bar down to a
              small floating pill with three separate icon buttons instead
              of one combined "History & settings" label). The wrapper spans
              the full width so the pill can center, but only the pill
              itself is clickable (`pointer-events-none`/`-auto` split) so
              the empty space beside it doesn't block scrolling/taps on the
              chat underneath. */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center lg:hidden">
            <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-neutral-800/90 p-1 shadow-lg shadow-black/40 backdrop-blur">
              <Link
                href="https://signedby.ai/dashboard"
                aria-label="Dashboard"
                title="Dashboard"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                <Home className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => openMobileSheet("history")}
                aria-label="History"
                title="History"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openMobileSheet("settings")}
                aria-label="Settings"
                title="Settings"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {hasAccess ? (
            <ConsoleChat
              key={resetKey}
              conversationId={activeId}
              initialMessages={initialMessages}
              onConversationSaved={handleSaved}
              certificateModePreference={certificateModePreference}
            />
          ) : (
            <ConsoleLockedChat />
          )}
        </div>
      </div>

      {/* Mobile bottom sheet — always in the DOM once opened at least once
          (see `everOpened`) so open/close both get the slide transition;
          before that first open, nothing inside it is mounted at all. */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileSheetOpen}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${mobileSheetOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileSheetOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-white/10 bg-neutral-950 p-4 shadow-2xl shadow-black/60 transition-transform duration-300 [padding-bottom:calc(env(safe-area-inset-bottom)+1rem)] ${
            mobileSheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-white/15" />
          <div className="flex shrink-0 items-center justify-between">
            <p className="text-sm font-medium text-white">{mobileSheetTab === "history" ? "History" : "Settings"}</p>
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              aria-label="Close"
              className="rounded-md p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {everOpened && (
            <div className="flex flex-1 flex-col gap-4">{mobileSheetTab === "history" ? historyBody : settingsBody}</div>
          )}
        </div>
      </div>
    </div>
  );
}
