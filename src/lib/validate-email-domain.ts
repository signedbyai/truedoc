import { promises as dns } from "dns";
import { withTimeout, TimeoutError } from "@/lib/with-timeout";

const LOOKUP_TIMEOUT_MS = 3000;

export type DomainCheckResult = { ok: true } | { ok: false; reason: string };

function noMxReason(domain: string): string {
  return `"${domain}" doesn't appear to accept email (no mail servers found) — check for a typo.`;
}

// Cheap pre-send sanity check: does this address's domain even have mail
// servers? Catches a typo'd or non-existent domain (gmial.com, acme.con)
// before an invite gets sent straight into a guaranteed bounce — see
// BOUNCE_TRACKING_SCOPE.md. Deliberately NOT a deliverability guarantee: a
// domain having MX records says nothing about whether the specific mailbox
// exists, only that mail could be routed there at all. Real mailbox
// verification (SMTP probing, or a paid validation API) isn't attempted
// here — see the scope doc for why.
//
// Fails OPEN on anything inconclusive (a DNS timeout, a resolver hiccup, or
// malformed input) rather than blocking a legitimate send over a transient
// blip or an unusual-but-real mail setup this check can't judge confidently.
// Only a genuine "this domain has no MX records at all" (ENOTFOUND/ENODATA)
// counts as a real, actionable signal.
export async function checkEmailDomainHasMx(email: string): Promise<DomainCheckResult> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return { ok: true }; // malformed input isn't this check's job — zod already validates shape

  try {
    const records = await withTimeout(dns.resolveMx(domain), LOOKUP_TIMEOUT_MS);
    if (records.length === 0) return { ok: false, reason: noMxReason(domain) };
    return { ok: true };
  } catch (err) {
    if (err instanceof TimeoutError) return { ok: true }; // inconclusive — fail open

    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") return { ok: false, reason: noMxReason(domain) };

    // Any other resolver error (network hiccup in this environment, etc.) is
    // also inconclusive, not evidence of a bad address.
    return { ok: true };
  }
}
