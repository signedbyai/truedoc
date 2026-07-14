// Tiny device-type classifier for DocGate click logging (src/app/g/[code]/
// route.ts). Deliberately a ~10-line regex, not a parsing library — the only
// thing this needs to answer is "mobile, tablet, or desktop" for a sender's
// engagement timeline, not full UA parsing.
export function classifyDevice(userAgent: string | null): "mobile" | "tablet" | "desktop" {
  if (!userAgent) return "desktop";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet(?!.*mobile)|kindle|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android(?=.*mobile)|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  return "desktop";
}
