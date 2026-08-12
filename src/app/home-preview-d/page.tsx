import type { Metadata } from "next";
import Link from "next/link";
import { HomepagePreviewD } from "@/components/homepage-preview-d";
import { getRequestCurrency } from "@/lib/currency.server";

// Variant D, direct ask 2026-08-12: "freedom to make your own." See
// homepage-preview-d.tsx's own comment for what's structurally different
// from every other variant (two-column interactive hero, inline DocuSign
// numbers, a grounded FAQ). Private, unlinked, noindexed — same status as
// /home-preview-a/b/c.
export const metadata: Metadata = {
  title: "Homepage preview (Tier 1 — D, original) — SignedBy",
  robots: { index: false, follow: false },
};

export default async function HomePreviewDPage() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="bg-slate-900 px-6 py-2 text-center text-xs text-slate-300">
        Internal preview — variant D, an original take (interactive Sign/Seal/Quote/Draft tabs, inline DocuSign
        numbers, a short FAQ) rather than a remix of{" "}
        <a href="/home-preview-b" className="underline hover:text-white">
          B
        </a>{" "}
        or{" "}
        <a href="/home-preview-c" className="underline hover:text-white">
          C
        </a>
        — not linked from the live site.
      </div>

      <HomepagePreviewD currency={currency} />

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
          <Link href="/developers" className="hover:text-slate-600">
            API docs
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
