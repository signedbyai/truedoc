"use client";

import { useState } from "react";
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
 *  Pro-gate (2026-07-31, direct instruction): a plan status box + pill
 *  always sits at the very bottom of the left column, on every plan. When
 *  the org lacks console access (below Pro), the OTHER left-hand boxes
 *  (history + usage panel) are replaced by ConsoleUpgradePanel, and the
 *  chat pane itself is replaced by ConsoleLockedChat — console genuinely
 *  doesn't work below Pro, so ConsoleChat is never even mounted in that
 *  case (on top of /api/console/chat independently 402ing a Free org). */
export function ConsoleWorkspace({
  plan,
  hasAccess,
  initialState,
  initialCapEnabled,
  initialCapCents,
  showIntro,
}: {
  plan: string;
  hasAccess: boolean;
  initialState: ConsoleBillingState | null;
  initialCapEnabled: boolean;
  initialCapCents: number;
  showIntro: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Bubble[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [loadingConversation, setLoadingConversation] = useState(false);

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
      }
    } finally {
      setLoadingConversation(false);
    }
  }

  function handleNewChat() {
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
        {hasAccess ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <ConsoleHistorySidebar activeId={activeId} onSelect={handleSelect} onNewChat={handleNewChat} refreshToken={historyRefreshToken} />
            </div>
            {initialState && (
              <ConsoleUsagePanel
                initialState={initialState}
                initialCapEnabled={initialCapEnabled}
                initialCapCents={initialCapCents}
                showIntro={showIntro}
              />
            )}
          </>
        ) : (
          <ConsoleUpgradePanel />
        )}
        <ConsolePlanStatus plan={plan} hasAccess={hasAccess} />
      </aside>

      <div>
        {hasAccess ? (
          <ConsoleChat key={resetKey} conversationId={activeId} initialMessages={initialMessages} onConversationSaved={handleSaved} />
        ) : (
          <ConsoleLockedChat />
        )}
      </div>
    </div>
  );
}
