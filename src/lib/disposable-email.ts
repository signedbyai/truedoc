import { isDisposableEmail } from "disposable-email-domains-js";

// Disposable/throwaway email blocking at signup (CONSOLE_FREE_TIER_SCOPE.md
// item #4's bot/abuse mitigation, built 2026-08-03 on direct instruction).
// Confirmed 2026-08-02 there was zero code anywhere in this app checking
// for disposable domains -- this closes that gap.
//
// Backed by disposable-email-domains-js (npm, CC0, zero dependencies), a
// maintained JS wrapper around the disposable-email-domains/
// disposable-email-domains GitHub list -- the community-maintained,
// widely-used source list for this exact purpose, not a hand-rolled or
// paid list. Picked over building a custom blocklist for the same reason
// checkEmailDomainHasMx (validate-email-domain.ts) uses Node's built-in DNS
// resolver instead of a paid validation API: this is a static lookup
// against a well-known list, not something that benefits from a vendor
// contract at this stage.
//
// Deliberately a plain synchronous boolean, unlike checkEmailDomainHasMx's
// richer DomainCheckResult -- there's no "inconclusive" case here (no
// network call, no timeout, just a list lookup), so there's nothing to fail
// open on.
export function isDisposableEmailAddress(email: string): boolean {
  return isDisposableEmail(email.trim().toLowerCase());
}
