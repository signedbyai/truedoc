"use client";

import { useSyncExternalStore } from "react";

// Lemonade-style time-of-day greeting (V3_Design_Inspiration.md #4).
// Client component because the greeting must follow the VIEWER's clock —
// the server renders in UTC on Vercel, which would say "Good morning" to
// an Amsterdam user at 1pm. Renders the old "Welcome back" on the server
// and swaps after mount; the brief neutral flash is preferable to a
// hydration mismatch or a wrong-timezone greeting.

/** Pure hour → greeting mapping, exported for tests. */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 && hour < 22) return "Good evening";
  return "Working late"; // 22:00–04:59
}

// useSyncExternalStore with a never-firing subscription is the sanctioned
// "different value on server vs client" pattern (no setState-in-effect):
// the server snapshot keeps SSR/hydration consistent, the client snapshot
// takes over after hydration. greetingForHour is stable within a render
// pass (it only changes on the hour), so the snapshot is safely cacheable.
const subscribe = () => () => {};
const getClientGreeting = () => greetingForHour(new Date().getHours());
const getServerGreeting = () => "Welcome back";

export function TimeGreeting({ firstName }: { firstName?: string | null }) {
  const greeting = useSyncExternalStore(subscribe, getClientGreeting, getServerGreeting);
  return (
    <>
      {greeting}
      {firstName ? `, ${firstName}` : ""}
    </>
  );
}
