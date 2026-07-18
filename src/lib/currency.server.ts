import "server-only";
import { cookies, headers } from "next/headers";
import { currencyForCountry, normalizeCurrency, CURRENCY_COOKIE, type Currency } from "./currency";

// Server-only: resolves the currency for the current request. A manual
// override cookie (the €/$ toggle) always wins; otherwise fall back to the
// visitor's country from Vercel's geo header; otherwise USD. Used by both the
// pricing pages (display) and the checkout route (billing) so the two can't
// disagree.
export async function getRequestCurrency(): Promise<Currency> {
  const cookieStore = await cookies();
  const override = normalizeCurrency(cookieStore.get(CURRENCY_COOKIE)?.value);
  if (override) return override;

  const h = await headers();
  return currencyForCountry(h.get("x-vercel-ip-country"));
}
