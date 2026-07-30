// console.signedby.ai (2026-07-30: promoted from "same deployment, root
// path rewritten" to a genuinely separate-feeling subdomain — see
// src/middleware.ts) is referenced from a few different places (the
// middleware doing the rewrite, the marketing page deciding whether its
// CTAs should be relative or cross-host, the app page deciding what "next"
// path to send someone to after login). Centralized here so all of them
// agree on the exact hostname instead of re-typing the string.
export const CONSOLE_HOST = "console.signedby.ai";

// An absolute console.signedby.ai URL for the given path — used for
// cross-host links (marketing CTAs reached via the main signedby.ai
// domain, the cap-warning email), since those need to be followed from
// anywhere, not just from within a request already on the console host.
export function consoleUrl(path: string): string {
  return `https://${CONSOLE_HOST}${path}`;
}

// The console app's public URL specifically — the common case of the
// above, kept as its own helper since it's the one most call sites want.
export function consoleAppUrl(): string {
  return consoleUrl("/app");
}

// Whether the current request/page is already being served under
// console.signedby.ai — lets a page render relative, same-host links
// there instead of a full cross-host URL, and know which "next" path
// shape (/app vs /console/app) is correct to send someone to after login.
export function isConsoleHost(host: string | null | undefined): boolean {
  return (host ?? "").split(":")[0].toLowerCase() === CONSOLE_HOST;
}

// The right `next` path for a login redirect depending on which host is
// serving the request: a clean "/app" when already on console.signedby.ai
// (middleware rewrites it to the real /console/app route), or the real
// route path directly when reached some other way (e.g. signedby.ai
// itself, for whatever still links there internally).
export function consoleAppNextPath(host: string | null | undefined): string {
  return isConsoleHost(host) ? "/app" : "/console/app";
}
