import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Local-language (FR) translation of /verified-badge-invoices/guide
// — 2026-08-22, direct ask, once the locale invoice pages (/fr/verified-badge-invoices
// etc.) were built but their own "read the guide" link still pointed at the
// English-only guide. Same content and structure as the English source
// (src/app/verified-badge-invoices/guide/page.tsx), translated. Two
// deliberate differences from the English page: this uses a fixed
// color="purple" CTA instead of the live ctaColorFlag() A/B test (same
// simplification the other locale pages already made — "tests LANGUAGE,
// not CTA copy"), and the step screenshots are the same English-UI images
// as every other locale page's product screenshots (known, accepted
// limitation — full dashboard UI translation is out of scope for this
// pass).
const TITLE = "Comment sceller vos factures avec un Verified Badge — Guide | SignedBy";
const DESCRIPTION =
  "Étape par étape : vérifiez votre identité une fois, puis scellez et badgez chaque facture que vous envoyez ensuite — ce que vous voyez, et ce que votre client voit en scannant.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/fr/verified-badge-invoices/guide" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/fr/verified-badge-invoices/guide" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SIGNUP_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_invoice_guide_fr&utm_medium=cta&utm_campaign=verified_badge_invoice_page_fr";

type GuideStep = {
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  body: string;
};

const SETUP_STEPS: GuideStep[] = [
  {
    title: "Ouvrez l'onglet Verified Badge",
    image: "/guide-badge-invoice-start-badge-tab.png",
    imageWidth: 1170,
    imageHeight: 1200,
    body: "Tableau de bord → Nouveau document → onglet Verified Badge. C'est un parcours distinct de l'onglet Signer — pas de destinataire à ajouter, rien à signer, juste un fichier à sceller.",
  },
  {
    title: "Choisissez votre PDF de facture",
    image: "/guide-badge-invoice-upload-first-invoice.png",
    imageWidth: 1170,
    imageHeight: 1000,
    body: "PDF uniquement. Si votre facture sort de votre logiciel de comptabilité dans un autre format, exportez-la ou imprimez-la en PDF d'abord. Donnez-lui un titre, puis cliquez sur Sceller ce fichier.",
  },
  {
    title: "Vérifiez votre identité (une fois)",
    image: "/guide-badge-invoice-verify-identity.png",
    imageWidth: 1170,
    imageHeight: 650,
    body: "Votre tout premier scellement nécessite une vérification de pièce d'identité, hébergée par Stripe et généralement effectuée en moins d'une minute. Chaque scellement suivant la réutilise automatiquement — vous ne reverrez plus cet écran.",
  },
  {
    title: "C'est scellé",
    image: "/guide-badge-invoice-sealed-first.png",
    imageWidth: 1170,
    imageHeight: 700,
    body: "SignedBy hache le fichier, l'horodate avec une véritable autorité d'horodatage (Sectigo, avec EuroTSA puis FreeTSA en secours automatiques), et génère votre badge — puis vous amène directement sur la page du document.",
  },
];

const FLOW_STEPS: GuideStep[] = [
  {
    title: "Scellez la facture suivante",
    image: "/guide-badge-invoice-seal-next-invoice.png",
    imageWidth: 1170,
    imageHeight: 950,
    body: "Même onglet, mêmes deux étapes — choisissez le fichier, cliquez sur Sceller ce fichier. Pas de vérification d'identité cette fois-ci ; c'est un coût unique, pas par facture.",
  },
  {
    title: "Vos fichiers de sortie sont prêts",
    image: "/guide-badge-invoice-outputs-ready.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Chaque scellement vous donne une image Badge, un PDF scellé, un Certificat, et une copie/QR du lien de vérification — le tout sur la propre page du document dans votre tableau de bord. Pour une facture, c'est l'image Badge qu'il faut utiliser : une petite marque que vous déposez directement dans le fichier, rien d'autre à gérer.",
  },
  {
    title: "Placez le badge sur votre facture",
    image: "/hero-verified-badge-invoice.png",
    imageWidth: 640,
    imageHeight: 820,
    body: "Collez l'image du badge dans un coin de votre facture avant de l'envoyer — comme un logo. Elle porte le QR code, la marque SignedBy et un lien de vérification court en texte brut, donc elle reste crédible même imprimée ou capturée en écran.",
  },
  {
    title: "Votre client le scanne",
    image: "/guide-badge-invoice-client-verifies.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Son appareil photo ouvre directement la page de vérification — sans application, sans compte. Elle confirme deux faits distincts : le fichier n'a pas changé depuis son scellement, et la personne qui l'a scellé a réussi une vraie vérification d'identité. C'est un vrai moyen de vérifier, pas juste faire confiance parce qu'un e-mail a l'air correct.",
  },
];

export default function VerifiedBadgeInvoicesGuideFrPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/fr">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Se connecter
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pour les indépendants et agences</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Guide de scellement et d&apos;envoi</h1>
        <p className="max-w-xl text-base text-slate-600">
          Deux parties : vérifier votre identité une fois, et ce qui se passe réellement à chaque fois que vous scellez et envoyez une facture ensuite.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:gap-3 sm:text-sm">
          <Link
            href="#part-1"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              1
            </span>
            Vérifier
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              2
            </span>
            Sceller
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              3
            </span>
            Envoyer
          </Link>
        </div>

        <Image
          src="/hero-verified-badge-invoice.png"
          alt="Un Verified Badge apposé dans le coin d'une facture de freelance — la marque SignedBy, un QR code scannable et un lien de vérification"
          width={640}
          height={820}
          className="mt-2 w-full max-w-xs rounded-xl border border-slate-200 shadow-lg"
          priority
        />
        <Link href="/fr/verified-badge-invoices" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Retour à Verified Badge pour factures
        </Link>
      </section>

      {/* Part 1 */}
      <section id="part-1" className="mx-auto w-full max-w-3xl px-6 pb-4 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Partie 1 — Vérifier votre identité (une seule fois)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Votre tout premier scellement Verified Badge inclut une vérification d&apos;identité unique. Tout ce qui suit tient en deux clics.
        </p>

        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {SETUP_STEPS.map((step, i) => (
            <div key={step.title} className="px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              </div>
              <Image
                src={step.image}
                alt={step.title}
                width={step.imageWidth}
                height={step.imageHeight}
                className="mx-auto mt-3 w-full rounded-lg border border-slate-200"
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Bon à savoir</h3>
          <p className="mt-2 text-sm text-slate-600">
            La vérification d&apos;identité est au niveau de l&apos;organisation, pas par document — toute personne de votre équipe qui scelle un document plus tard réutilise la même vérification une fois qu&apos;elle l&apos;a faite elle-même. L&apos;offre Free inclut 3 scellements Verified Badge par mois ; l&apos;offre Pro ou supérieure permet un scellement illimité, sans frais par scellement.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section id="part-2" className="mx-auto w-full max-w-3xl px-6 py-10 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Partie 2 — Sceller et envoyer une facture, à chaque fois</h2>
        <p className="mt-2 text-sm text-slate-600">Voici ce qui se passe concrètement une fois que vous êtes vérifié et prêt à envoyer une vraie facture.</p>

        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.title} className="px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              </div>
              <Image
                src={step.image}
                alt={step.title}
                width={step.imageWidth}
                height={step.imageHeight}
                className={`mx-auto mt-3 rounded-lg border border-slate-200 ${step.image.startsWith("/hero-") ? "w-full max-w-xs" : "w-full"}`}
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Bon à savoir</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Un Verified Badge prouve que votre facture a existé, non modifiée, à la date d&apos;un horodatage vérifié cryptographiquement, scellée par une personne à l&apos;identité vérifiée — une affirmation réelle et utile, différente de « ça a l&apos;air légitime ». Cela n&apos;empêche personne de falsifier une autre facture, et ce n&apos;est pas ce que ça prétend faire.
            </li>
            <li>
              Vous préférez garder le fichier d&apos;origine totalement intact ? Utilisez plutôt le Certificat que le badge — il consigne la même preuve séparément plutôt que de tamponner le PDF lui-même, ce qui convient généralement mieux à une dataroom qu&apos;à une facture que vous remettez à un seul client.
            </li>
            <li>
              Vous pouvez aussi sceller un fichier depuis le chat Console ou l&apos;API plutôt que le tableau de bord — voir la{" "}
              <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
                documentation développeurs
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Essayez SignedBy gratuitement</h2>
        <p className="mt-2 text-sm text-slate-600">3 scellements Verified Badge par mois, sans carte bancaire, upgrade seulement si besoin.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color="purple" page="verified-badge-invoices-guide-fr" position="footer" variant="fr">
          Obtenez votre Verified Badge maintenant →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/fr/verified-badge-invoices" className="hover:text-slate-600">
            Verified Badge pour factures
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Modèles gratuits
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
