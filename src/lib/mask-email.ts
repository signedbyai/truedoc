// Shown on the signer-facing verification screen ("we sent a code to
// j***@client.com") — enough for the signer to confirm it's their own
// inbox without fully exposing the address to anyone glancing at the
// screen. Deliberately simple (first character + domain) rather than a
// smarter partial-reveal scheme.
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local[0]}***@${domain}`;
}
