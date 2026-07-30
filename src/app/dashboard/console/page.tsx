import { redirect } from "next/navigation";
import { consoleAppUrl } from "@/lib/console-host";

// Console moved off to its own subdomain 2026-07-30 (see
// src/lib/console-host.ts, src/middleware.ts). This route kept as a
// redirect rather than deleted outright, in case anything old — a
// bookmark, a stale email link, browser history — still points here.
// Redirects to the real cross-host URL, not the internal /console/app
// route, since that's console's actual home now.
export default function DashboardConsoleRedirect() {
  redirect(consoleAppUrl());
}
