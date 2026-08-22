import type { Metadata } from "next";
import Link from "next/link";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepageEsEs } from "@/components/homepage-es-es";
import { getRequestCurrency } from "@/lib/currency.server";

// Peninsular Spanish (Spain, tuteo) homepage — 2026-08-22, direct ask,
// sibling to es-ar/page.tsx (Argentina, voseo). Built once the Argentina
// Reddit campaign's audience was confirmed small (~50-60k) and the DE/FR
// pages were confirmed already live, rounding out a DE/FR/ES-ES expansion.
// See homepage-es-es.tsx for the voseo -> tuteo conversion notes and
// [[site-localization-scope-2026-08-20]] for the original scope.
//
// Indexable (not noindexed) for the same reason as every other locale
// homepage — a real page real visitors land on from the Spain Reddit ad —
// but self-canonical to itself, not to "/" or "/es-ar", so it doesn't
// compete with either for the same query.
const TITLE = "SignedBy — Firmas electrónicas, sin vueltas";
const DESCRIPTION =
  "SignedBy es una alternativa rápida y accesible para firmar electrónicamente — pensada para profesionales independientes y equipos pequeños.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/es-es" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/es-es" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function LandingPageEsEs() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <HomepageEsEs currency={currency} />

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/docusign" className="hover:text-slate-600">
            vs DocuSign
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Precios
          </Link>
          <Link href="/developers" className="hover:text-slate-600">
            Documentación de la API
          </Link>
          <Link href="/security" className="hover:text-slate-600">
            Seguridad
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Términos
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacidad
          </Link>
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
          <Link href="/verify" className="hover:text-slate-600">
            Verificar un documento
          </Link>
        </p>
      </footer>
    </main>
  );
}
