import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepageCurrent } from "@/components/homepage-current";
import { HomepageTwoColumn } from "@/components/homepage-two-column";
import { ctaColorFlag, homepageVariantFlag } from "@/flags";
import { getRequestCurrency } from "@/lib/currency.server";

// Self-canonical so the homepage is the one indexed URL for the brand — title
// and description are inherited from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  // EUR for Eurozone visitors, USD for the rest (from geo/cookie) — same
  // resolution the /pricing page and checkout use, so the figures stay in
  // sync across the whole funnel. See src/lib/currency.ts.
  const currency = await getRequestCurrency();
  const ctaColor = await ctaColorFlag();
  // Homepage layout test, started 2026-07-25 — see src/flags.ts and
  // marketing/homepage-layout-test.md. "current" is the live centred hero;
  // "v20" is the two-column layout that had been kept on dev as a preview.
  // Everything each variant needs (header, hero, product shot, value row,
  // trusted-by, features, pricing) lives in its own component; only the
  // footer below is identical between them and stays shared here.
  const homepageVariant = await homepageVariantFlag();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor, "homepage-variant": homepageVariant }} />
      <ReferralCapture />
      {homepageVariant === "v20" ? (
        <HomepageTwoColumn currency={currency} ctaColor={ctaColor} />
      ) : (
        <HomepageCurrent currency={currency} ctaColor={ctaColor} />
      )}

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/signnow" className="hover:text-slate-600">
            vs SignNow
          </Link>
          <Link href="/vs/docusign" className="hover:text-slate-600">
            vs DocuSign
          </Link>
          <Link href="/vs/pandadoc" className="hover:text-slate-600">
            vs PandaDoc
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Free templates
          </Link>
          <Link href="/security" className="hover:text-slate-600">
            Security
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
          <Link href="/verify" className="hover:text-slate-600">
            Verify a document
          </Link>
        </p>
      </footer>
    </main>
  );
}
