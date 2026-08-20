import type { Metadata } from "next";
import Link from "next/link";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepageIt } from "@/components/homepage-it";
import { getRequestCurrency } from "@/lib/currency.server";

// Italian homepage — 2026-08-20, local-language growth test. See
// [[site-localization-scope-2026-08-20]] and homepage-it.tsx.
const TITLE = "SignedBy — eSignatures, senza fronzoli";
const DESCRIPTION =
  "SignedBy è un'alternativa veloce ed economica per le eSignature — pensata per freelance e piccoli team.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/it" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/it" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function LandingPageIt() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <HomepageIt currency={currency} />

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/docusign" className="hover:text-slate-600">
            vs DocuSign
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Prezzi
          </Link>
          <Link href="/developers" className="hover:text-slate-600">
            Documentazione API
          </Link>
          <Link href="/security" className="hover:text-slate-600">
            Sicurezza
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Termini
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
          <Link href="/verify" className="hover:text-slate-600">
            Verifica un documento
          </Link>
        </p>
      </footer>
    </main>
  );
}
