import { appUrl } from "@/lib/stripe";

// "Give a month, get a month" referral loop (V3 #9). One shared Stripe coupon
// powers both sides: a 100%-off, duration:once coupon created in the Stripe
// dashboard (same manual setup as the price IDs), its id in STRIPE_REFERRAL_COUPON.
// - Referred customer: coupon applied at their first checkout (first month free).
// - Referrer: same coupon applied to their subscription once the referred org
//   makes its first real payment (or stashed as pending_referral_reward if the
//   referrer is still on the free plan, redeemed at their next checkout).

// Unambiguous alphabet (no 0/O/1/I) so codes are easy to read aloud/retype.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 7): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function referralLink(code: string): string {
  return `${appUrl()}/?ref=${code}`;
}

export function referralCouponId(): string | undefined {
  return process.env.STRIPE_REFERRAL_COUPON || undefined;
}

export const REFERRAL_REWARD_LABEL = "1 month of Pro, free";
