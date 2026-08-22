import type { Metadata } from "next";
import Link from "next/link";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepageEsAr } from "@/components/homepage-es-ar";
import { getRequestCurrency } from "@/lib/currency.server";

// Spanish (Rioplatense/Argentina) homepage — 2026-08-20, local-language
// growth test. Moved from /es to /es-ar on 2026-08-22 (direct ask) once a
// separate Spain-Spanish variant (/es-es) was built — the Argentina Reddit
// campaign audience turned out to be small (~50-60k), prompting the DE/FR/
// ES-ES expansion, and "/es" was ambiguous once a second Spanish dialect
// existed. See [[site-localization-scope-2026-08-20]] and
// src/components/homepage-es-ar.tsx for the full reasoning. Deliberately a
// standalone route + component, not a locale-prefixed rewrite of "/" — this
// is a single reversible test page, not the site-wide i18n infra scoped as
// Phase 3. The old /es path 301s here (and /es/verified-badge-invoices to
// /es-ar/verified-badge-invoices) — see next.config.ts — so the live
// Reddit "ES-AR" campaign's existing destination URL keeps working even
// though its dashboard label should be updated to /es-ar directly when
// convenient.
//
// Indexable (not noindexed) since this is a real page real visitors land
// on from the Spanish Reddit ad, same reasoning as the English homepage —
// but self-canonical to itself, not to "/", so it doesn't compete with the
// English homepage for the same query.
const TITLE = "SignedBy — Firmas electrónicas, sin vueltas";
const DESCRIPTION =
  "SignedBy es una alternativa rápida y accesible para firmar electrónicamente — pensada para profesionales independientes y equipos chicos.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/es-ar" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/es-ar" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function LandingPageEsAr() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <HomepageEsAr currency={currency} />

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
