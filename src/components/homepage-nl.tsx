"use client";
// See homepage-es.tsx for the full reasoning behind this file's shape
// (translated copy of homepage-preview-g.tsx, "use client" required because
// TABS_NL passes lucide-react icon components as a prop into
// InteractiveProductTabsG — see [[site-localization-spanish-build-2026-08-20]]
// for the 500-error bug this avoids). Dutch (Netherlands-standard) homepage
// variant, built 2026-08-20 alongside the German/French/Italian variants,
// same day as the Spanish one, for [[site-localization-scope-2026-08-20]].
//
// Tagline: "eSignatures, without the runaround" -> "eSignatures, zonder
// gedoe" — "zonder gedoe" is a common, idiomatic Dutch way of saying
// "without hassle/fuss", matching the English source closely.

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { InteractiveProductTabsG, type ProductTab } from "@/components/homepage-preview-g-tabs";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";

const DOCUSIGN_COMPARISON = [
  { label: "Goedkoopste betaalde abonnement", signedby: "$7/maand vast", competitor: "$10-15/maand, 1 gebruiker" },
  { label: "3 gebruikers", signedby: "$14/maand totaal (Team)", competitor: "$75-195/maand totaal, per gebruiker geprijsd" },
];

const FAQS = [
  {
    q: "Is er een gratis abonnement?",
    a: "Ja — het Free-abonnement bevat 3 documenten per maand voor 1 gebruiker, zonder creditcard.",
  },
  {
    q: "Kan ik mijn eigen documenten ondertekenen zonder ze naar iemand te sturen?",
    a: "Ja. Met Seal kun je een document zelf ondertekenen en vergrendelen met een RFC 3161 vertrouwde tijdstempel en geverifieerde identiteit — zonder ontvanger nodig.",
  },
  {
    q: "Waar worden mijn gegevens opgeslagen?",
    a: "In de EU. SignedBy is AVG-conform met gegevensopslag in de EER.",
  },
  {
    q: "Gebruiken jullie mijn documenten om AI-modellen te trainen?",
    a: "Nee — de AI van SignedBy traint nooit met jouw documenten.",
  },
];

const VALUE_PROPS: { label: string; path: string }[] = [
  { label: "Sneller versturen", path: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" },
  { label: "Voortgang volgen", path: "M3 12h4l3 8 4-16 3 8h4" },
  { label: "Toegang beperken", path: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" },
  { label: "Deals sluiten", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12l2 2 4-4" },
];

const PRICING_NL: { name: string; id: "free" | "starter" | "team" | "business"; blurb: string }[] = [
  { name: "Free", id: "free", blurb: "3 documenten/maand, 1 gebruiker" },
  { name: "Pro", id: "starter", blurb: "Onbeperkt documenten, 1 gebruiker" },
  { name: "Team", id: "team", blurb: "Tot 3 gebruikers, eigen huisstijl" },
  { name: "Business", id: "business", blurb: "Tot 5 gebruikers, API-toegang" },
];

const TABS_NL: ProductTab[] = [
  {
    key: "sign",
    title: "Tekenen",
    description: "Plaats handtekening-, paraaf-, datum- en tekstvelden op elke PDF en verstuur binnen enkele seconden ter ondertekening.",
    image: "/hero-sign-mobile-composite.png",
    alt: "De SignedBy-veldeditor met het mobiele ondertekenscherm erover, met de schuifknop om te tekenen en te versturen",
    width: 1642,
    height: 1070,
    objectPosition: "right top",
    Icon: Signature,
  },
  {
    key: "seal",
    title: "Verzegelen",
    description: "Onderteken en vergrendel zelf een document met een RFC 3161 vertrouwde tijdstempel en geverifieerde identiteit — zonder ontvanger nodig.",
    image: "/hero-verified-badge-invoice-d.png",
    alt: "Een factuur met de SignedBy Verified & Sealed-medaille in de rechterbovenhoek",
    width: 740,
    height: 650,
    objectPosition: "right top",
    Icon: ShieldCheck,
  },
  {
    key: "quote",
    title: "Offerte",
    description: "Beschrijf de klus in gewone taal en Magic Quote maakt er een ondertekenbare, gespecificeerde offerte van.",
    image: "/hero-magic-quote.png",
    alt: "De Magic Quote-editor: offertetitel, valuta, klant en regels met berekende totalen",
    width: 568,
    height: 483,
    objectPosition: "center top",
    Icon: Receipt,
  },
  {
    key: "draft",
    title: "Opstellen",
    description: "Beschrijf wat je nodig hebt en AI stelt een verstuurklare overeenkomst op — controleer, bewerk en verstuur in dezelfde stap.",
    image: "/hero-new-document-draft.png",
    alt: "Het tabblad Opstellen: keuzemenu's voor documenttype en taal, een beschrijving in gewone taal en een knop om de conceptversie te genereren",
    width: 567,
    height: 513,
    objectPosition: "center top",
    Icon: Sparkles,
  },
];

export function HomepageNl({ currency }: { currency: Currency }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Image
          src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
          alt="SignedBy"
          width={266}
          height={64}
          className="h-7 w-auto"
          priority
        />
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Inloggen
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pt-12 pb-16 sm:grid-cols-2 sm:items-start sm:pt-16">
        <div className="text-center sm:text-left">
          <Link
            href="/vs/docusign"
            className="mb-6 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 sm:text-sm"
          >
            <span className="hidden sm:inline">Teams besparen</span>
            <span className="sm:hidden">Bespaar</span>
            <span className="font-bold text-yellow-300">$700+/jaar</span>
            <span>vs DocuSign</span>
            <span className="hidden sm:inline">— reken mee</span>
            <span aria-hidden>→</span>
          </Link>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">eSignatures</span>, zonder
            gedoe
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-slate-600 sm:mx-0 sm:max-w-sm sm:text-xl">
            SignedBy is een snel en betaalbaar alternatief voor eSignatures — gemaakt voor zelfstandige
            professionals en kleine teams die een paar documenten per maand tekenen, niet voor een hele
            salesafdeling.
          </p>
          <div className="mt-9 flex flex-col items-center sm:items-start">
            <CtaLink
              href="/login?intent=signup&utm_source=homepage_nl&utm_medium=cta&utm_campaign=homepage_page_nl&utm_content=preview-g-nl"
              color="purple"
              page="homepage-nl"
              position="hero"
              variant="nl"
            >
              Gratis starten →
            </CtaLink>
            <p className="mt-3 text-xs text-slate-400">Geen creditcard nodig — 3 gratis documenten per maand.</p>
          </div>
        </div>

        <InteractiveProductTabsG tabs={TABS_NL} />
      </section>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-8">
        <div className="grid w-full max-w-xl grid-cols-4 gap-2 border-y border-slate-100 py-4 sm:gap-4 sm:py-5">
          {VALUE_PROPS.map((v) => (
            <div key={v.label} className="flex flex-col items-center gap-1.5 text-center sm:gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-300 text-slate-900 sm:h-8 sm:w-8">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  aria-hidden
                >
                  <path d={v.path} />
                </svg>
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-700 sm:text-xs">{v.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Het echte kostenverschil</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-3 sm:px-6">
            <span></span>
            <span className="text-center">SignedBy</span>
            <span className="text-center">DocuSign</span>
          </div>
          {DOCUSIGN_COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col gap-2.5 px-4 py-4 text-sm sm:grid sm:grid-cols-3 sm:items-center sm:gap-0 sm:px-6 ${i > 0 ? "border-t border-slate-100" : ""}`}
            >
              <span className="font-semibold text-slate-900 sm:font-normal sm:text-slate-600">{row.label}</span>
              <div className="flex items-baseline justify-between gap-3 sm:block sm:text-center">
                <span className="shrink-0 text-xs font-medium text-slate-400 sm:hidden">SignedBy</span>
                <span className="flex-1 text-right font-semibold text-slate-900 sm:text-center">{row.signedby}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 sm:block sm:text-center">
                <span className="shrink-0 text-xs font-medium text-slate-400 sm:hidden">DocuSign</span>
                <span className="flex-1 text-right text-slate-500 sm:text-center">{row.competitor}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center">
          <Link href="/vs/docusign" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Bekijk de volledige vergelijking →
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
          <div className="text-center sm:text-left">
            <div className="mb-3 flex items-center justify-center gap-2.5 sm:justify-start">
              <Image
                src="/brand/signedby-badge-black-small.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg"
              />
              <h2 className="text-lg font-semibold text-slate-900">Koppel je CRM</h2>
            </div>
            <p className="mx-auto max-w-sm text-slate-600 sm:mx-0 sm:max-w-none">
              Een REST API en uitgaande webhooks — maak en verstuur documenten vanuit je CRM, vraag de status op,
              of ontvang een melding zodra er iets is ondertekend.
            </p>
            <Link
              href="/developers"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              Bekijk de API-documentatie <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 font-mono text-xs leading-relaxed text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.25)]">
            <div className="text-slate-500">POST /api/v1/documents</div>
            <div className="mt-2 text-sky-300">
              {"{"}
              <div className="pl-4">
                <span className="text-sky-300">&quot;title&quot;</span>
                <span className="text-slate-500">: </span>
                <span className="text-emerald-300">&quot;Freelance Agreement&quot;</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-sky-300">&quot;signers&quot;</span>
                <span className="text-slate-500">: [&quot;jane@acme.com&quot;]</span>
              </div>
              {"}"}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">Vertrouwd door</p>
        <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-logo-marquee flex w-max items-center gap-12">
            {[...TRUSTED_BY_NL, ...TRUSTED_BY_NL].map((logo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${logo.name}-${i}`}
                src={logo.src}
                alt={logo.name}
                className={`${logo.height} w-auto shrink-0 opacity-40 grayscale transition-opacity hover:opacity-70`}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            Bedrijf gevestigd in de EU
          </span>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            AVG-conform · Gegevens opgeslagen in de EER
          </Link>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            AI traint nooit met jouw documenten
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Eenvoudige prijzen</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRICING_NL.map((p) => (
            <Card key={p.name} className="text-center">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatPrice(currency, p.id, { withPeriod: true })}
                </p>
                <p className="mt-2 text-xs text-slate-500">{p.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Bekijk alle abonnementsdetails →
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 pb-16">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Vragen</h2>
        <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FAQS.map((f) => (
            <div key={f.q} className="px-5 py-4">
              <p className="font-semibold text-slate-900">{f.q}</p>
              <p className="mt-1 text-sm text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const TRUSTED_BY_NL = [
  { name: "SyncMint", src: "/logos/syncmint.png", height: "h-8" },
  { name: "AlphaIndigo", src: "/logos/alphaindigo.png", height: "h-5" },
  { name: "Studio Vider", src: "/logos/studio-vider.png", height: "h-5" },
];
