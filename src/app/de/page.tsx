import type { Metadata } from "next";
import Link from "next/link";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepageDe } from "@/components/homepage-de";
import { getRequestCurrency } from "@/lib/currency.server";

// German homepage — 2026-08-20, local-language growth test. See
// [[site-localization-scope-2026-08-20]] and homepage-de.tsx.
const TITLE = "SignedBy — eSignaturen, ohne Umwege";
const DESCRIPTION =
  "SignedBy ist eine schnelle, erschwingliche Alternative für eSignaturen — entwickelt für Einzelunternehmer und kleine Teams.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/de" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/de" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function LandingPageDe() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <HomepageDe currency={currency} />

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/docusign" className="hover:text-slate-600">
            vs DocuSign
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Preise
          </Link>
          <Link href="/developers" className="hover:text-slate-600">
            API-Dokumentation
          </Link>
          <Link href="/security" className="hover:text-slate-600">
            Sicherheit
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            AGB
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Datenschutz
          </Link>
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
          <Link href="/verify" className="hover:text-slate-600">
            Dokument verifizieren
          </Link>
        </p>
      </footer>
    </main>
  );
}
