import { redirect } from "next/navigation";

// Console moved to /console/app 2026-07-30 (its own shell, deliberately
// outside DashboardNav — see src/app/console/app/layout.tsx). This route
// kept as a redirect rather than deleted outright, in case anything old —
// a bookmark, a stale email link, browser history — still points here.
export default function DashboardConsoleRedirect() {
  redirect("/console/app");
}
