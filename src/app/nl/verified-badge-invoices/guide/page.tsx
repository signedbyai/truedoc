import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Local-language (NL) translation of /verified-badge-invoices/guide
// — 2026-08-22, direct ask, once the locale invoice pages (/nl/verified-badge-invoices
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
const TITLE = "Facturen verzegelen met Verified Badge — Handleiding | SignedBy";
const DESCRIPTION =
  "Stap voor stap: verifieer je identiteit één keer, verzegel en voorzie daarna elke factuur die je verstuurt van een badge — wat jij ziet, en wat je klant ziet bij het scannen.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nl/verified-badge-invoices/guide" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/nl/verified-badge-invoices/guide" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SIGNUP_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_invoice_guide_nl&utm_medium=cta&utm_campaign=verified_badge_invoice_page_nl";

type GuideStep = {
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  body: string;
};

const SETUP_STEPS: GuideStep[] = [
  {
    title: "Open het tabblad Verified Badge",
    image: "/guide-badge-invoice-start-badge-tab.png",
    imageWidth: 1170,
    imageHeight: 1200,
    body: "Dashboard → Nieuw document → tabblad Verified Badge. Dit is een apart traject naast het tabblad Ondertekenen — geen ontvanger toe te voegen en niets te ondertekenen, alleen een bestand om te verzegelen.",
  },
  {
    title: "Kies je factuur-PDF",
    image: "/guide-badge-invoice-upload-first-invoice.png",
    imageWidth: 1170,
    imageHeight: 1000,
    body: "Alleen PDF's. Komt je factuur in een ander formaat uit je boekhoudsoftware, exporteer of print hem dan eerst naar PDF. Geef hem een titel en klik op Dit bestand verzegelen.",
  },
  {
    title: "Verifieer je identiteit (eenmalig)",
    image: "/guide-badge-invoice-verify-identity.png",
    imageWidth: 1170,
    imageHeight: 650,
    body: "Je allereerste verzegeling vraagt om een identiteitscontrole met een geldig ID, gehost door Stripe en meestal in minder dan een minuut klaar. Elke volgende verzegeling gebruikt die automatisch opnieuw — dit scherm zie je niet nog een keer.",
  },
  {
    title: "Je bent verzegeld",
    image: "/guide-badge-invoice-sealed-first.png",
    imageWidth: 1170,
    imageHeight: 700,
    body: "SignedBy hasht het bestand, voorziet het van een tijdstempel via een echte Tijdstempelautoriteit (Sectigo, met EuroTSA en daarna FreeTSA als automatische fallback), en genereert je badge — en brengt je vervolgens naar de eigen pagina van het document.",
  },
];

const FLOW_STEPS: GuideStep[] = [
  {
    title: "Verzegel de volgende factuur",
    image: "/guide-badge-invoice-seal-next-invoice.png",
    imageWidth: 1170,
    imageHeight: 950,
    body: "Zelfde tabblad, dezelfde twee stappen — kies het bestand, klik op Dit bestand verzegelen. Deze keer geen identiteitscontrole; dat is een eenmalige kost, niet per factuur.",
  },
  {
    title: "Je uitvoerbestanden zijn klaar",
    image: "/guide-badge-invoice-outputs-ready.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Elke verzegeling levert je een Badge-afbeelding, een verzegelde PDF, een Certificaat en een kopie/QR van de verificatielink — allemaal op de eigen pagina van het document in je dashboard. Voor een factuur is de Badge-afbeelding wat je nodig hebt: een klein merkteken dat je direct in het bestand plaatst, verder niets te beheren.",
  },
  {
    title: "Zet de badge op je factuur",
    image: "/hero-verified-badge-invoice.png",
    imageWidth: 640,
    imageHeight: 820,
    body: "Plak de badge-afbeelding in een hoek van je factuur voordat je hem verstuurt — net als een logo. Hij bevat de QR-code, het SignedBy-merk en een korte verificatielink als platte tekst, dus blijft geloofwaardig ogen, zelfs afgedrukt of als screenshot.",
  },
  {
    title: "Je klant scant hem",
    image: "/guide-badge-invoice-client-verifies.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "De camera van je klant opent direct de verificatiepagina — geen app, geen account nodig. Die bevestigt twee losse feiten: het bestand is niet veranderd sinds het verzegelen, en wie het verzegelde heeft een echte identiteitscontrole doorstaan. Dat is een echte manier om te controleren, niet alleen maar vertrouwen dat een e-mail er goed uitziet.",
  },
];

export default function VerifiedBadgeInvoicesGuideNlPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/nl">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Inloggen
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Voor zelfstandigen en bureaus</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Handleiding voor verzegelen en versturen</h1>
        <p className="max-w-xl text-base text-slate-600">
          Twee delen: je identiteit één keer verifiëren, en wat er daarna elke keer echt gebeurt als je een factuur verzegelt en verstuurt.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:gap-3 sm:text-sm">
          <Link
            href="#part-1"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              1
            </span>
            Verifiëren
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              2
            </span>
            Verzegelen
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              3
            </span>
            Versturen
          </Link>
        </div>

        <Image
          src="/hero-verified-badge-invoice.png"
          alt="Een Verified Badge in de hoek van een freelance-factuur — het SignedBy-merk, een scanbare QR-code en een verificatielink"
          width={640}
          height={820}
          className="mt-2 w-full max-w-xs rounded-xl border border-slate-200 shadow-lg"
          priority
        />
        <Link href="/nl/verified-badge-invoices" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Terug naar Verified Badge voor facturen
        </Link>
      </section>

      {/* Part 1 */}
      <section id="part-1" className="mx-auto w-full max-w-3xl px-6 pb-4 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Deel 1 — Je identiteit verifiëren (eenmalig)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Je allereerste Verified Badge-verzegeling omvat een eenmalige identiteitscontrole. Alles daarna is nog maar twee klikken.
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
          <h3 className="text-base font-semibold text-slate-900">Goed om te weten</h3>
          <p className="mt-2 text-sm text-slate-600">
            De identiteitscontrole geldt voor de hele organisatie, niet per document — iedereen in je team die later een document verzegelt, gebruikt dezelfde geverifieerde controle zodra diegene die zelf één keer heeft doorlopen. Het Free-abonnement omvat 3 Verified Badge-verzegelingen per maand; vanaf Pro is verzegelen onbeperkt, zonder kosten per verzegeling.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section id="part-2" className="mx-auto w-full max-w-3xl px-6 py-10 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Deel 2 — Een factuur verzegelen en versturen, elke keer</h2>
        <p className="mt-2 text-sm text-slate-600">Dit gebeurt er in de praktijk zodra je geverifieerd bent en een echte factuur wilt versturen.</p>

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
          <h3 className="text-base font-semibold text-slate-900">Goed om te weten</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Een Verified Badge bewijst dat jouw factuur onveranderd bestond, met een cryptografisch geverifieerde tijdstempel, verzegeld door iemand met een geverifieerde identiteit — een echte, nuttige, andere claim dan &quot;dit ziet er legitiem uit&quot;. Het weerhoudt niemand ervan een andere factuur te vervalsen, en dat beweert het ook niet.
            </li>
            <li>
              Wil je liever het originele bestand volledig ongemoeid laten? Gebruik dan het Certificaat in plaats van de badge — dat legt hetzelfde bewijs apart vast in plaats van de PDF zelf te stempelen, wat meestal beter past bij een dataroom dan bij een factuur die je aan één klant geeft.
            </li>
            <li>
              Je kunt een bestand ook verzegelen vanuit de Console-chat of de API in plaats van het dashboard — zie de{" "}
              <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
                ontwikkelaarsdocumentatie
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Probeer SignedBy gratis</h2>
        <p className="mt-2 text-sm text-slate-600">3 Verified Badge-verzegelingen per maand, geen creditcard nodig, upgrade alleen als je meer nodig hebt.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color="purple" page="verified-badge-invoices-guide-nl" position="footer" variant="nl">
          Vraag nu je Verified Badge aan →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/nl/verified-badge-invoices" className="hover:text-slate-600">
            Verified Badge voor facturen
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Gratis sjablonen
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Prijzen
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Voorwaarden
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
        </p>
      </footer>
    </main>
  );
}
