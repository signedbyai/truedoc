"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

type ConversationSummary = { id: string; title: string; updated_at: string };

/** Top part of the console's left sidebar (console-workspace.tsx) — a
 *  "+ New chat" button plus the list of the current user's saved chat
 *  sessions (GET /api/console/conversations). Refetches whenever
 *  `refreshToken` changes, which the parent bumps after each autosave so
 *  a brand-new conversation (or a retitled one, since the title is
 *  derived from the first message) shows up without a manual reload. */
export function ConsoleHistorySidebar({
  activeId,
  onSelect,
  onNewChat,
  refreshToken,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  refreshToken: number;
}) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/console/conversations")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data.conversations) ? data.conversations : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onNewChat}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>

      <div className="mt-1 flex flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            title={item.title}
            className={`truncate rounded-lg px-3 py-2 text-left text-sm ${
              item.id === activeId ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200"
            }`}
          >
            {item.title}
          </button>
        ))}
        {!loading && items.length === 0 && <p className="px-3 py-2 text-xs text-neutral-600">No past chats yet.</p>}
      </div>
    </div>
  );
}
