"use client";
// See homepage-es.tsx for the full reasoning behind this file's shape.
// German homepage variant, built 2026-08-20 for
// [[site-localization-scope-2026-08-20]].
//
// Tagline: "eSignatures, without the runaround" -> "eSignaturen, ohne
// Umwege" — idiomatic German for "without detours/roundabout ways",
// matching the English source. "eSignaturen" keeps the lowercase "e" as a
// deliberate brand-style exception to standard German noun capitalization
// (same convention as "eBay", "eMail" historically), matching the EN and
// Spanish/Dutch pages' own "eSignatures"/"eSignatures" styling.

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { InteractiveProductTabsG, type ProductTab } from "@/components/homepage-preview-g-tabs";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";

const DOCUSIGN_COMPARISON = [
  { label: "Günstigster bezahlter Tarif", signedby: "$7/Monat pauschal", competitor: "$10-15/Monat, 1 Nutzer" },
  { label: "3 Nutzer", signedby: "$14/Monat gesamt (Team)", competitor: "$75-195/Monat gesamt, Preis pro Nutzer" },
];

const FAQS = [
  {
    q: "Gibt es einen kostenlosen Tarif?",
    a: "Ja — der Free-Tarif umfasst 3 Dokumente im Monat für 1 Nutzer, ohne Kreditkarte.",
  },
  {
    q: "Kann ich meine eigenen Dokumente unterschreiben, ohne sie an jemanden zu senden?",
    a: "Ja. Mit Seal kannst du ein Dokument selbst unterschreiben und mit einem vertrauenswürdigen RFC-3161-Zeitstempel und verifizierter Identität versiegeln — ganz ohne Empfänger.",
  },
  {
    q: "Wo werden meine Daten gespeichert?",
    a: "In der EU. SignedBy ist DSGVO-konform mit Datenspeicherung im EWR.",
  },
  {
    q: "Nutzt ihr meine Dokumente, um KI-Modelle zu trainieren?",
    a: "Nein — die KI von SignedBy trainiert nie mit deinen Dokumenten.",
  },
];

const VALUE_PROPS: { label: string; path: string }[] = [
  { label: "Schneller versenden", path: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" },
  { label: "Fortschritt verfolgen", path: "M3 12h4l3 8 4-16 3 8h4" },
  { label: "Zugriff steuern", path: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" },
  { label: "Deals abschließen", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12l2 2 4-4" },
];

const PRICING_DE: { name: string; id: "free" | "starter" | "team" | "business"; blurb: string }[] = [
  { name: "Free", id: "free", blurb: "3 Dokumente/Monat, 1 Nutzer" },
  { name: "Pro", id: "starter", blurb: "Unbegrenzt Dokumente, 1 Nutzer" },
  { name: "Team", id: "team", blurb: "Bis zu 3 Nutzer, eigenes Branding" },
  { name: "Business", id: "business", blurb: "Bis zu 5 Nutzer, API-Zugriff" },
];

const TABS_DE: ProductTab[] = [
  {
    key: "sign",
    title: "Unterschreiben",
    description: "Platziere Unterschrift-, Kürzel-, Datums- und Textfelder auf jedem PDF und versende es in Sekunden zur Unterschrift.",
    image: "/hero-sign-mobile-composite.png",
    alt: "Der SignedBy-Feldeditor mit dem mobilen Unterschriftsbildschirm darüber, mit dem Schieberegler zum Unterschreiben und Absenden",
    width: 1642,
    height: 1070,
    objectPosition: "right top",
    Icon: Signature,
  },
  {
    key: "seal",
    title: "Versiegeln",
    description: "Unterschreibe und versiegle ein Dokument selbst mit einem vertrauenswürdigen RFC-3161-Zeitstempel und verifizierter Identität — ganz ohne Empfänger.",
    image: "/hero-verified-badge-invoice-d.png",
    alt: "Eine Rechnung mit der SignedBy Verified & Sealed-Medaille in der oberen rechten Ecke",
    width: 740,
    height: 650,
    objectPosition: "right top",
    Icon: ShieldCheck,
  },
  {
    key: "quote",
    title: "Angebot",
    description: "Beschreibe den Auftrag in normaler Sprache, und Magic Quote macht daraus ein unterschriftsreifes, detailliertes Angebot.",
    image: "/hero-magic-quote.png",
    alt: "Der Magic-Quote-Editor: Angebotstitel, Währung, Empfänger und Positionen mit berechneten Summen",
    width: 568,
    height: 483,
    objectPosition: "center top",
    Icon: Receipt,
  },
  {
    key: "draft",
    title: "Entwurf",
    description: "Beschreibe, was du brauchst, und die KI erstellt einen versandfertigen Vertrag — prüfen, bearbeiten und versenden in einem Schritt.",
    image: "/hero-new-document-draft.png",
    alt: "Der Tab Entwurf: Auswahl von Dokumenttyp und Sprache, eine Beschreibung in normaler Sprache und ein Button zum Erstellen des Entwurfs",
    width: 567,
    height: 513,
    objectPosition: "center top",
    Icon: Sparkles,
  },
];

export function HomepageDe({ currency }: { currency: Currency }) {
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
          Anmelden
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pt-12 pb-16 sm:grid-cols-2 sm:items-start sm:pt-16">
        <div className="min-w-0 text-center sm:text-left">
          <Link
            href="/vs/docusign"
            className="mb-6 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 sm:text-sm"
          >
            <span className="hidden sm:inline">Teams sparen</span>
            <span className="sm:hidden">Sparen</span>
            <span className="font-bold text-yellow-300">$700+/Jahr</span>
            <span>vs DocuSign</span>
            <span className="hidden sm:inline">— so rechnet sich das</span>
            <span aria-hidden>→</span>
          </Link>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">eSignaturen</span>, ohne
            Umwege
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-slate-600 sm:mx-0 sm:max-w-sm sm:text-xl">
            SignedBy ist eine schnelle, erschwingliche Alternative für eSignaturen — entwickelt für
            Einzelunternehmer und kleine Teams, die ein paar Dokumente im Monat unterschreiben, nicht für eine
            ganze Vertriebsabteilung.
          </p>
          <div className="mt-9 flex flex-col items-center sm:items-start">
            <CtaLink
              href="/login?intent=signup&utm_source=homepage_de&utm_medium=cta&utm_campaign=homepage_page_de&utm_content=preview-g-de"
              color="purple"
              page="homepage-de"
              position="hero"
              variant="de"
            >
              Kostenlos starten →
            </CtaLink>
            <p className="mt-3 text-xs text-slate-400">Keine Kreditkarte erforderlich — 3 kostenlose Dokumente pro Monat.</p>
          </div>
        </div>

        <InteractiveProductTabsG tabs={TABS_DE} />
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
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Der tatsächliche Kostenunterschied</h2>
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
            Vollständigen Vergleich ansehen →
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
              <h2 className="text-lg font-semibold text-slate-900">Mit deinem CRM verbinden</h2>
            </div>
            <p className="mx-auto max-w-sm text-slate-600 sm:mx-0 sm:max-w-none">
              Eine REST-API und ausgehende Webhooks — erstelle und versende Dokumente direkt aus deinem CRM,
              frage den Status ab oder werde benachrichtigt, sobald etwas unterschrieben wurde.
            </p>
            <Link
              href="/developers"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              API-Dokumentation ansehen <span aria-hidden>→</span>
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
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">Vertraut von</p>
        <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-logo-marquee flex w-max items-center gap-12">
            {[...TRUSTED_BY_DE, ...TRUSTED_BY_DE].map((logo, i) => (
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
            Unternehmen mit Sitz in der EU
          </span>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            DSGVO-konform · Datenspeicherung im EWR
          </Link>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            KI trainiert nie mit deinen Dokumenten
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Einfache Preise</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRICING_DE.map((p) => (
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
            Alle Tarifdetails ansehen →
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 pb-16">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Fragen</h2>
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

const TRUSTED_BY_DE = [
  { name: "SyncMint", src: "/logos/syncmint.png", height: "h-8" },
  { name: "AlphaIndigo", src: "/logos/alphaindigo.png", height: "h-5" },
  { name: "Studio Vider", src: "/logos/studio-vider.png", height: "h-5" },
];
