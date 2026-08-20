import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Dutch companion to /verified-badge-invoices — 2026-08-20. Deliberately
// simplified vs. the EN page: single fixed layout (no A-F CTA test), since
// this test is about language, not CTA copy. See
// src/app/es/verified-badge-invoices/page.tsx for the full rationale this
// mirrors.
const TITLE = "Verified Badge — bewijs dat jouw factuur echt van jou is, geen AI-vervalsing | SignedBy";
const DESCRIPTION =
  "Verzegel je factuur als onveranderd en met geverifieerde identiteit voordat je 'm verstuurt. Je klant scant een code en weet meteen dat hij echt van jou is. Gratis te starten, geen creditcard nodig.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nl/verified-badge-invoices" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/nl/verified-badge-invoices" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_nl&utm_medium=cta&utm_campaign=verified_badge_invoice_page_nl";

const FAQ = [
  {
    q: "Voorkomt dit dat iemand mijn factuur vervalst?",
    a: "Nee — en dat beweert het ook niet. Een Verified Badge bewijst dat jouw echte factuur onveranderd bestond op een cryptografisch geverifieerd tijdstip, verzegeld door een persoon met geverifieerde identiteit. Dat geeft je klant een echte manier om het te controleren, in plaats van er gewoon op te vertrouwen dat een e-mail er goed uitziet — het is geen garantie dat er nooit iets mis kan gaan.",
  },
  {
    q: "Wat ziet de klant precies?",
    a: "Een badge op je factuur — een QR-code, het SignedBy-merkteken en een korte verificatielink als platte tekst, zodat het ook afgedrukt of als screenshot legitiem oogt. Scannen of bezoeken leidt naar een openbare verificatiepagina: je naam, wanneer het bestand is verzegeld, en bevestiging dat het sindsdien niet is gewijzigd. Geen account of inloggen nodig om te controleren.",
  },
  {
    q: "Wat als mijn identiteitscontrole verouderd is?",
    a: "Bij je eerste zegel wordt je identiteit geverifieerd via een controle van je identiteitsbewijs (ongeveer een minuut, via Stripe). Volgende zegels hergebruiken diezelfde geverifieerde controle in plaats van je ID elke keer opnieuw te scannen — goedkoper en sneller. De verificatiepagina toont altijd \"identiteit geverifieerd op [datum]\" naast \"verzegeld op [datum]\" als twee aparte gegevens, zodat duidelijk is of de identiteitscontrole ouder is dan dit specifieke zegel.",
  },
  {
    q: "Werkt dit ook voor andere bestanden dan PDF?",
    a: "Voorlopig alleen PDF's. Komt je factuur uit je boekhoudsoftware in een ander formaat, exporteer of print 'm dan eerst naar PDF en verzegel dat bestand.",
  },
  {
    q: "Welk abonnement heb ik nodig?",
    a: "Elk abonnement, ook Free, zonder creditcard. Free bevat 3 Verified Badge-zegels per maand. Met Pro of hoger verzegel je onbeperkt, zonder kosten per zegel. Verzegel een bestand direct vanuit het menu Nieuw document in je dashboard — ontwikkelaars kunnen dit ook via de Console-chat of de API doen, zie de developer-documentatie.",
  },
  {
    q: "Wat maakt de tijdstempel echt \"cryptografisch geverifieerd\"?",
    a: "Elk zegel wordt voorgelegd aan een echte Time Stamping Authority (de publieke RFC 3161-dienst van Sectigo, met EuroTSA en daarna FreeTSA als automatische back-up als Sectigo niet bereikbaar is) die de hash van het bestand samen met het tijdstip ondertekent. Dat is door iedereen onafhankelijk te verifiëren, met alleen vertrouwen in de TSA nodig — niet alleen een datum in de eigen database van SignedBy. De verificatiepagina op signedby.ai/verify toont welke TSA een bepaald zegel heeft ondersteund.",
  },
];

export default function VerifiedBadgeInvoicesNlPage() {
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
        <Link href="/nl">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Inloggen
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          AI kan in seconden een factuur vervalsen. Bewijs dat de jouwe echt van jou is.{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Een oplichter kan tegenwoordig in een paar tellen een overtuigende nepfactuur maken met jouw naam en
          huisstijl erop, en die naar een van je klanten sturen. Verzegel eerst je echte factuur: een hash en een
          bewijs met geverifieerde identiteit van wat je echt hebt verstuurd, zodat je klant het kan controleren
          voordat hij betaalt.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Beveilig je factuur gratis
            <span
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-emerald-200 bg-emerald-50"
              aria-hidden="true"
            />
          </div>
          <CtaLink href={START_HREF} color="purple" page="verified-badge-invoices-nl" position="hero" variant="nl">
            Vraag nu je Verified Badge aan →
          </CtaLink>
          <p className="text-xs text-slate-400">Gratis te starten, geen creditcard nodig — kost ongeveer een minuut.</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="relative w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
            <Image
              src="/hero-verified-badge-invoice.png"
              alt="Een Verified Badge gestempeld in de hoek van een freelance factuur — het SignedBy-merkteken, een scanbare QR-code en een verificatielink"
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
        <h2 className="text-lg font-semibold text-slate-900">Zo werkt het</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Eenmalig verifiëren",
              body: "Een eenmalige controle van je identiteitsbewijs (ongeveer een minuut, via Stripe). Wordt hergebruikt voor elk volgend zegel — je hoeft je ID niet steeds opnieuw te scannen.",
            },
            {
              step: "2. Verzegel de factuur",
              body: "Upload gewoon je definitieve factuur-PDF vanuit je dashboard — SignedBy hasht 'm, voorziet 'm van een tijdstempel en genereert je badge.",
            },
            {
              step: "3. Voeg de badge toe",
              body: "Plaats de badge op je factuur voordat je 'm verstuurt. Een klant scant 'm en komt op een openbare verificatiepagina — geen account nodig.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{s.step}</p>
              <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/verified-badge-invoices/guide"
          className="mt-4 block rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
        >
          <h3 className="text-base font-semibold text-slate-900">Nieuw bij SignedBy? Lees de handleiding voor verzegelen en versturen</h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Stap voor stap: verifieer je identiteit eenmalig, en precies wat er gebeurt elke keer dat je daarna
            een factuur verzegelt en verstuurt.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
            Lees de handleiding →
          </span>
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">Wat dit eigenlijk bewijst</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Een Verified Badge is een bewijs van herkomst en integriteit, geen fraudedetectietool. Het bevestigt
          dat dit exacte bestand onveranderd bestond op een cryptografisch geverifieerd tijdstip, verzegeld door
          een persoon met geverifieerde identiteit — een echte, nuttige claim die iets anders zegt dan &ldquo;dit
          ziet er legitiem uit&rdquo;. Bewust eerlijk geformuleerd: te veel beloven zou juist het enige
          ondermijnen dat echt standhoudt bij nader onderzoek.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Beveilig je factuur gratis</h2>
        <p className="mt-2 text-sm text-slate-600">
          Gratis te starten — 3 zegels per maand inbegrepen, geen creditcard nodig. Meer nodig? Met het
          Pro-abonnement of hoger krijg je onbeperkt verzegelen, zonder kosten per zegel.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color="purple" page="verified-badge-invoices-nl" position="footer" variant="nl">
          Vraag nu je Verified Badge aan →
        </CtaLink>
      </section>

      <section className="mx-auto w-full max-w-3xl pb-12 px-6">
        <h2 className="text-lg font-semibold text-slate-900">Veelgestelde vragen</h2>
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
          Ook op SignedBy:{" "}
          <Link href="/console" className="underline underline-offset-2 hover:text-slate-900">
            Console
          </Link>{" "}
          ·{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/verify" className="underline underline-offset-2 hover:text-slate-900">
            Document verifiëren
          </Link>{" "}
          ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
            API- en MCP-documentatie
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/verified-badge-invoices/guide" className="hover:text-slate-600">
            Handleiding verzegelen en versturen
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
