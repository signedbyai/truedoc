import { createHash, randomBytes } from "crypto";

// Business-tier API keys. The raw key is shown exactly once at generation
// time and never stored — only its SHA-256 hash is persisted, so a leaked
// database can't be used to impersonate an org's API access. The prefix is
// kept in the clear purely so the settings UI can show "which key is this"
// without re-displaying the secret.
const KEY_PREFIX = "sb_live_";

export function generateApiKey() {
  const raw = KEY_PREFIX + randomBytes(24).toString("hex");
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, KEY_PREFIX.length + 8) };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  const header = request.headers.get("x-api-key");
  return header?.trim() || null;
}
