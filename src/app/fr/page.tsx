import type { Metadata } from "next";
import Link from "next/link";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepageFr } from "@/components/homepage-fr";
import { getRequestCurrency } from "@/lib/currency.server";

// French homepage — 2026-08-20, local-language growth test. See
// [[site-localization-scope-2026-08-20]] and homepage-fr.tsx.
const TITLE = "SignedBy — eSignatures, sans chichis";
const DESCRIPTION =
  "SignedBy est une alternative rapide et abordable pour les eSignatures — conçue pour les indépendants et les petites équipes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/fr" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/fr" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function LandingPageFr() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <HomepageFr currency={currency} />

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/docusign" className="hover:text-slate-600">
            vs DocuSign
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Tarifs
          </Link>
          <Link href="/developers" className="hover:text-slate-600">
            Documentation de l'API
          </Link>
          <Link href="/security" className="hover:text-slate-600">
            Sécurité
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Conditions
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Confidentialité
          </Link>
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
          <Link href="/verify" className="hover:text-slate-600">
            Vérifier un document
          </Link>
        </p>
      </footer>
    </main>
  );
}
