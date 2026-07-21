// Validates a "next" query param before ever using it in a redirect. Query
// params are attacker-controlled input — without this, a crafted link like
// /login?next=https://evil.example could send someone through our own,
// trusted-looking login flow and then hand them off to a phishing site
// (an open-redirect). Only a same-site relative path is safe: it must start
// with a single "/" and not "//" (a protocol-relative URL — the browser
// treats "//evil.example" as "https://evil.example", not a local path) or
// contain "://" (an absolute URL smuggled in past the leading-slash check).
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;
  return raw;
}
