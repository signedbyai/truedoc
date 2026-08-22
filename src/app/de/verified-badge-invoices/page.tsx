import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// German companion to /verified-badge-invoices — 2026-08-20. See
// src/app/es/verified-badge-invoices/page.tsx for the full rationale this
// mirrors (single fixed layout, no A-F CTA test).
const TITLE = "Verified Badge — beweise, dass deine Rechnung wirklich von dir ist, keine KI-Fälschung | SignedBy";
const DESCRIPTION =
  "Versiegle deine Rechnung als unverändert und mit verifizierter Identität, bevor du sie versendest. Dein Kunde scannt einen Code und weiß sofort, dass sie wirklich von dir ist. Kostenlos starten, keine Kreditkarte nötig.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/de/verified-badge-invoices" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/de/verified-badge-invoices" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_de&utm_medium=cta&utm_campaign=verified_badge_invoice_page_de";

const FAQ = [
  {
    q: "Verhindert das, dass jemand meine Rechnung fälscht?",
    a: "Nein — das behauptet es auch nicht. Ein Verified Badge beweist, dass deine echte Rechnung zu einem kryptografisch verifizierten Zeitpunkt unverändert existierte, versiegelt von einer Person mit verifizierter Identität. Das gibt deinem Kunden eine echte Möglichkeit zur Prüfung, statt sich nur darauf zu verlassen, dass eine E-Mail seriös aussieht — es ist keine Garantie, dass nie etwas schiefgehen kann.",
  },
  {
    q: "Was sieht der Kunde tatsächlich?",
    a: "Ein Badge auf deiner Rechnung — ein QR-Code, das SignedBy-Zeichen und ein kurzer Verifizierungslink als reiner Text, sodass es auch gedruckt oder als Screenshot seriös wirkt. Scannen oder Aufrufen führt zu einer öffentlichen Verifizierungsseite: dein Name, wann die Datei versiegelt wurde, und Bestätigung, dass sie seitdem nicht verändert wurde. Kein Konto oder Login zur Prüfung nötig.",
  },
  {
    q: "Was, wenn meine Identitätsprüfung schon älter ist?",
    a: "Bei deinem ersten Siegel wird deine Identität per Ausweisprüfung verifiziert (etwa eine Minute, über Stripe). Spätere Siegel nutzen dieselbe verifizierte Prüfung, statt deinen Ausweis jedes Mal neu zu scannen — günstiger und schneller. Die Verifizierungsseite zeigt immer \"Identität verifiziert am [Datum]\" neben \"versiegelt am [Datum]\" als zwei getrennte Angaben, sodass klar ist, falls die Identitätsprüfung älter ist als dieses spezifische Siegel.",
  },
  {
    q: "Funktioniert das auch für Nicht-PDF-Dateien?",
    a: "Vorerst nur PDF. Kommt deine Rechnung in einem anderen Format aus deiner Buchhaltungssoftware, exportiere oder drucke sie zuerst als PDF und versiegle dann diese Datei.",
  },
  {
    q: "Welchen Tarif brauche ich?",
    a: "Jeden Tarif, auch Free, ohne Kreditkarte. Free enthält 3 Verified-Badge-Siegel pro Monat. Mit Pro oder höher versiegelst du unbegrenzt, ohne Kosten pro Siegel. Versiegle eine Datei direkt über das Menü \"Neues Dokument\" in deinem Dashboard — Entwickler können das auch über den Console-Chat oder die API tun, siehe die Entwicklerdokumentation.",
  },
  {
    q: "Was macht den Zeitstempel wirklich \"kryptografisch verifiziert\"?",
    a: "Jedes Siegel wird an eine echte Zeitstempelstelle übermittelt (Sectigos öffentlicher RFC-3161-Dienst, mit EuroTSA und danach FreeTSA als automatischem Ausweichdienst, falls Sectigo nicht erreichbar ist), die den Hash der Datei zusammen mit der Uhrzeit signiert. Das kann jeder unabhängig überprüfen, indem er nur der Zeitstempelstelle vertraut — nicht nur einem Datum in SignedBys eigener Datenbank. Die Verifizierungsseite auf signedby.ai/verify zeigt, welche Zeitstempelstelle ein bestimmtes Siegel abgesichert hat.",
  },
];

export default function VerifiedBadgeInvoicesDePage() {
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
        <Link href="/de">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Anmelden
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          KI kann in Sekunden eine Rechnung fälschen. Beweise, dass deine wirklich von dir ist.{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Ein Betrüger kann heute in Sekunden eine überzeugende gefälschte Rechnung mit deinem Namen und
          Branding erstellen und an einen deiner Kunden senden. Versiegle zuerst deine echte Rechnung: ein Hash
          und ein Nachweis mit verifizierter Identität dessen, was du tatsächlich gesendet hast, damit dein
          Kunde es vor der Zahlung prüfen kann.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Sichere deine Rechnung kostenlos ab
            <span
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-emerald-200 bg-emerald-50"
              aria-hidden="true"
            />
          </div>
          <CtaLink href={START_HREF} color="purple" page="verified-badge-invoices-de" position="hero" variant="de">
            Jetzt Verified Badge holen →
          </CtaLink>
          <p className="text-xs text-slate-400">Kostenlos starten, keine Kreditkarte nötig — dauert etwa eine Minute.</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="relative w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
            <Image
              src="/hero-verified-badge-invoice.png"
              alt="Ein Verified Badge in der Ecke einer Freelancer-Rechnung — das SignedBy-Zeichen, ein scanbarer QR-Code und ein Verifizierungslink"
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
        <h2 className="text-lg font-semibold text-slate-900">So funktioniert es</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Einmal verifizieren",
              body: "Eine einmalige Ausweisprüfung (etwa eine Minute, über Stripe). Wird für jedes zukünftige Siegel wiederverwendet — kein erneutes Scannen deines Ausweises nötig.",
            },
            {
              step: "2. Rechnung versiegeln",
              body: "Lade einfach deine fertige Rechnungs-PDF über dein Dashboard hoch — SignedBy hasht sie, versieht sie mit einem Zeitstempel und erstellt dein Badge.",
            },
            {
              step: "3. Badge einfügen",
              body: "Füge das Badge auf deiner Rechnung ein, bevor du sie versendest. Ein Kunde scannt es und landet auf einer öffentlichen Verifizierungsseite — kein Konto nötig.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{s.step}</p>
              <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/de/verified-badge-invoices/guide"
          className="mt-4 block rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
        >
          <h3 className="text-base font-semibold text-slate-900">Neu bei SignedBy? Lies die Anleitung zum Versiegeln und Versenden</h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Schritt für Schritt: verifiziere deine Identität einmal, und erfahre genau, was danach bei jedem
            Versiegeln und Versenden einer Rechnung passiert.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
            Anleitung lesen →
          </span>
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">Was das eigentlich beweist</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Ein Verified Badge ist ein Herkunfts- und Integritätsnachweis, kein Betrugserkennungs-Tool. Es
          bestätigt, dass genau diese Datei zu einem kryptografisch verifizierten Zeitpunkt unverändert
          existierte, versiegelt von einer Person mit verifizierter Identität — eine echte, nützliche Aussage,
          die sich von &bdquo;das sieht seriös aus&ldquo; unterscheidet. Bewusst ehrlich formuliert: Übertreibung
          würde hier genau das untergraben, was tatsächlich einer Prüfung standhält.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Sichere deine Rechnung kostenlos ab</h2>
        <p className="mt-2 text-sm text-slate-600">
          Kostenlos starten — 3 Siegel pro Monat inklusive, keine Kreditkarte nötig. Mehr nötig? Mit Pro oder
          höher versiegelst du unbegrenzt, ohne Kosten pro Siegel.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color="purple" page="verified-badge-invoices-de" position="footer" variant="de">
          Jetzt Verified Badge holen →
        </CtaLink>
      </section>

      <section className="mx-auto w-full max-w-3xl pb-12 px-6">
        <h2 className="text-lg font-semibold text-slate-900">Häufig gestellte Fragen</h2>
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
          Ebenfalls bei SignedBy:{" "}
          <Link href="/console" className="underline underline-offset-2 hover:text-slate-900">
            Console
          </Link>{" "}
          ·{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/verify" className="underline underline-offset-2 hover:text-slate-900">
            Dokument verifizieren
          </Link>{" "}
          ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
            API- und MCP-Dokumentation
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/de/verified-badge-invoices/guide" className="hover:text-slate-600">
            Anleitung zum Versiegeln und Versenden
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Preise
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            AGB
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Datenschutz
          </Link>
        </p>
      </footer>
    </main>
  );
}
