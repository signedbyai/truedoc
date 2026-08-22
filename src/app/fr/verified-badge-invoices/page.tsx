import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// French companion to /verified-badge-invoices — 2026-08-20. See
// src/app/es/verified-badge-invoices/page.tsx for the full rationale this
// mirrors (single fixed layout, no A-F CTA test).
const TITLE = "Verified Badge — prouvez que votre facture vient vraiment de vous, pas d'un faux généré par IA | SignedBy";
const DESCRIPTION =
  "Scellez votre facture comme inaltérée et avec une identité vérifiée avant de l'envoyer. Votre client scanne un code et sait instantanément qu'elle vient bien de vous. Gratuit pour commencer, sans carte bancaire.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/fr/verified-badge-invoices" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/fr/verified-badge-invoices" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_fr&utm_medium=cta&utm_campaign=verified_badge_invoice_page_fr";

const FAQ = [
  {
    q: "Est-ce que cela empêche quelqu'un de falsifier ma facture ?",
    a: "Non — et ce n'est pas ce que cela prétend faire. Un Verified Badge prouve que votre vraie facture existait, inaltérée, à un horodatage vérifié cryptographiquement, scellée par une personne à l'identité vérifiée. Cela donne à votre client un vrai moyen de vérifier, plutôt que de simplement faire confiance à l'apparence d'un e-mail — ce n'est pas une garantie qu'il ne peut jamais rien arriver de grave.",
  },
  {
    q: "Que voit réellement le client ?",
    a: "Un badge sur votre facture — un QR code, le sigle SignedBy et un court lien de vérification en texte brut, qui reste lisible même imprimé ou en capture d'écran. En le scannant ou en le visitant, on arrive sur une page de registre public : votre nom, la date de scellement du fichier, et la confirmation qu'il n'a pas été modifié depuis. Aucun compte ni connexion nécessaire pour vérifier.",
  },
  {
    q: "Et si ma vérification d'identité est ancienne ?",
    a: "Votre premier sceau vérifie votre identité via un contrôle de pièce d'identité (environ une minute, via Stripe). Les sceaux suivants réutilisent cette même vérification au lieu de rescanner votre pièce d'identité à chaque fois — moins cher et plus rapide. La page de registre affiche toujours \"identité vérifiée le [date]\" à côté de \"scellé le [date]\" comme deux informations distinctes, afin qu'il soit clair si la vérification d'identité est antérieure à ce sceau en particulier.",
  },
  {
    q: "Cela fonctionne-t-il pour des fichiers autres que PDF ?",
    a: "PDF uniquement pour l'instant. Si votre facture provient d'un logiciel de comptabilité dans un autre format, exportez-la ou imprimez-la d'abord en PDF, puis scellez ce fichier.",
  },
  {
    q: "De quelle offre ai-je besoin ?",
    a: "N'importe quelle offre, y compris Free, sans carte bancaire. Free comprend 3 sceaux Verified Badge par mois. L'offre Pro ou supérieure permet un scellement illimité, sans frais par sceau. Scellez un fichier directement depuis le menu Nouveau document de votre tableau de bord — les développeurs peuvent aussi le faire depuis le chat Console ou l'API, voir la documentation développeurs.",
  },
  {
    q: "Qu'est-ce qui rend l'horodatage réellement \"vérifié cryptographiquement\" ?",
    a: "Chaque sceau est soumis à une véritable autorité d'horodatage (le service public RFC 3161 de Sectigo, avec EuroTSA puis FreeTSA en secours automatique si Sectigo est injoignable) qui signe le hash du fichier avec l'heure. Cela peut être vérifié de manière indépendante par n'importe qui, en ne faisant confiance qu'à l'autorité d'horodatage — pas seulement à une date dans la base de données de SignedBy. La page de registre sur signedby.ai/verify indique quelle autorité d'horodatage a validé un sceau donné.",
  },
];

export default function VerifiedBadgeInvoicesFrPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/fr">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Se connecter
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          L&apos;IA peut falsifier une facture en quelques secondes. Prouvez que la vôtre vient vraiment de vous.{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Un escroc peut désormais fabriquer en quelques secondes une fausse facture convaincante à votre nom
          et à vos couleurs, et l&apos;envoyer à l&apos;un de vos clients. Scellez d&apos;abord votre vraie facture : un hash
          et une preuve avec identité vérifiée de ce que vous avez réellement envoyé, pour que votre client
          puisse vérifier avant de payer.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Sécurisez votre facture gratuitement
            <span
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-emerald-200 bg-emerald-50"
              aria-hidden="true"
            />
          </div>
          <CtaLink href={START_HREF} color="purple" page="verified-badge-invoices-fr" position="hero" variant="fr">
            Obtenez votre Verified Badge maintenant →
          </CtaLink>
          <p className="text-xs text-slate-400">Gratuit pour commencer, sans carte bancaire — environ une minute à configurer.</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="relative w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
            <Image
              src="/hero-verified-badge-invoice.png"
              alt="Un Verified Badge apposé dans le coin d'une facture de freelance — le sigle SignedBy, un QR code scannable et un lien de vérification"
              width={640}
              height={820}
              priority
              sizes="(max-width: 640px) 90vw, 384px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Comment ça marche</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Vérifiez-vous une fois",
              body: "Une vérification d'identité unique (environ une minute, via Stripe). Réutilisée pour chaque futur sceau — pas besoin de rescanner votre pièce d'identité à chaque fois.",
            },
            {
              step: "2. Scellez la facture",
              body: "Importez simplement le PDF final de votre facture depuis votre tableau de bord — SignedBy la hashe, l'horodate et génère votre badge.",
            },
            {
              step: "3. Intégrez le badge",
              body: "Placez le badge sur votre facture avant de l'envoyer. Le client le scanne et arrive sur une page de vérification publique — aucun compte nécessaire.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{s.step}</p>
              <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/fr/verified-badge-invoices/guide"
          className="mt-4 block rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
        >
          <h3 className="text-base font-semibold text-slate-900">Nouveau sur SignedBy ? Consultez le guide de scellement et d&apos;envoi</h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Étape par étape : vérifiez votre identité une fois, et ce qui se passe exactement à chaque
            scellement et envoi de facture par la suite.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
            Lire le guide →
          </span>
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">Ce que cela prouve réellement</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Un Verified Badge est une preuve de provenance et d&apos;intégrité, pas un outil de détection de fraude.
          Il confirme que ce fichier exact existait, inaltéré, à un horodatage vérifié cryptographiquement,
          scellé par une personne à l&apos;identité vérifiée — une affirmation réelle et utile, différente de
          &laquo;&nbsp;ça a l&apos;air légitime&nbsp;&raquo;. Une formulation volontairement honnête : en faire trop
          ici affaiblirait la seule chose qui résiste réellement à un examen approfondi.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Sécurisez votre facture gratuitement</h2>
        <p className="mt-2 text-sm text-slate-600">
          Gratuit pour commencer — 3 sceaux par mois inclus, sans carte bancaire. Besoin de plus ? L&apos;offre Pro
          ou supérieure permet un scellement illimité, sans frais par sceau.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color="purple" page="verified-badge-invoices-fr" position="footer" variant="fr">
          Obtenez votre Verified Badge maintenant →
        </CtaLink>
      </section>

      <section className="mx-auto w-full max-w-3xl pb-12 px-6">
        <h2 className="text-lg font-semibold text-slate-900">Questions fréquentes</h2>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FAQ.map((item) => (
            <div key={item.q} className="px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="text-sm text-slate-500">
          Aussi sur SignedBy :{" "}
          <Link href="/console" className="underline underline-offset-2 hover:text-slate-900">
            Console
          </Link>{" "}
          ·{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/verify" className="underline underline-offset-2 hover:text-slate-900">
            Vérifier un document
          </Link>{" "}
          ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
            Documentation API et MCP
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/fr/verified-badge-invoices/guide" className="hover:text-slate-600">
            Guide de scellement et d&apos;envoi
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Tarifs
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Conditions
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Confidentialité
          </Link>
        </p>
      </footer>
    </main>
  );
}
