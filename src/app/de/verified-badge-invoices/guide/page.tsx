import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Local-language (DE) translation of /verified-badge-invoices/guide
// — 2026-08-22, direct ask, once the locale invoice pages (/de/verified-badge-invoices
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
const TITLE = "Rechnungen mit Verified Badge versiegeln — Anleitung | SignedBy";
const DESCRIPTION =
  "Schritt für Schritt: verifiziere deine Identität einmal, dann versiegle und markiere jede Rechnung, die du danach versendest — was du siehst, und was dein Kunde beim Scannen sieht.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/de/verified-badge-invoices/guide" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/de/verified-badge-invoices/guide" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SIGNUP_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_invoice_guide_de&utm_medium=cta&utm_campaign=verified_badge_invoice_page_de";

type GuideStep = {
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  body: string;
};

const SETUP_STEPS: GuideStep[] = [
  {
    title: "Verified-Badge-Tab öffnen",
    image: "/guide-badge-invoice-start-badge-tab.png",
    imageWidth: 1170,
    imageHeight: 1200,
    body: "Dashboard → Neues Dokument → Verified-Badge-Tab. Das ist ein eigener Weg, getrennt vom Unterschreiben-Tab — kein Empfänger hinzuzufügen, nichts zu unterschreiben, nur eine Datei zu versiegeln.",
  },
  {
    title: "Rechnungs-PDF auswählen",
    image: "/guide-badge-invoice-upload-first-invoice.png",
    imageWidth: 1170,
    imageHeight: 1000,
    body: "Nur PDFs. Kommt deine Rechnung als anderes Format aus der Buchhaltungssoftware, exportiere oder drucke sie zuerst als PDF. Gib ihr einen Titel und klicke auf Datei versiegeln.",
  },
  {
    title: "Identität verifizieren (einmalig)",
    image: "/guide-badge-invoice-verify-identity.png",
    imageWidth: 1170,
    imageHeight: 650,
    body: "Dein allererstes Siegel braucht einen Ausweis-Check, gehostet von Stripe, meist in unter einer Minute erledigt. Jedes weitere Siegel nutzt das automatisch wieder — diesen Bildschirm siehst du kein zweites Mal.",
  },
  {
    title: "Versiegelt",
    image: "/guide-badge-invoice-sealed-first.png",
    imageWidth: 1170,
    imageHeight: 700,
    body: "SignedBy hasht die Datei, versieht sie mit einem echten Zeitstempel einer Zeitstempelstelle (Sectigo, mit EuroTSA und danach FreeTSA als automatischen Fallbacks) und erzeugt dein Badge — danach landest du direkt auf der Seite des Dokuments.",
  },
];

const FLOW_STEPS: GuideStep[] = [
  {
    title: "Die nächste Rechnung versiegeln",
    image: "/guide-badge-invoice-seal-next-invoice.png",
    imageWidth: 1170,
    imageHeight: 950,
    body: "Derselbe Tab, dieselben zwei Schritte — Datei auswählen, auf Datei versiegeln klicken. Diesmal keine Identitätsprüfung — die ist eine einmalige Sache, keine pro Rechnung.",
  },
  {
    title: "Deine Ausgaben sind bereit",
    image: "/guide-badge-invoice-outputs-ready.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Jedes Siegel liefert dir ein Badge-Bild, ein versiegeltes PDF, ein Zertifikat und eine Kopie/QR des Verifizierungslinks — alles auf der eigenen Seite des Dokuments in deinem Dashboard. Für eine Rechnung ist das Badge-Bild das Richtige: ein kleines Zeichen, das du direkt in die Datei einfügst, sonst nichts zu verwalten.",
  },
  {
    title: "Das Badge auf deine Rechnung setzen",
    image: "/hero-verified-badge-invoice.png",
    imageWidth: 640,
    imageHeight: 820,
    body: "Füge das Badge-Bild vor dem Versenden in eine Ecke deiner Rechnung ein — genau wie ein Logo. Es trägt den QR-Code, die SignedBy-Marke und einen kurzen Verifizierungslink als Klartext, sodass es auch gedruckt oder als Screenshot noch legitim wirkt.",
  },
  {
    title: "Dein Kunde scannt es",
    image: "/guide-badge-invoice-client-verifies.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Die Kamera öffnet direkt die Verifizierungsseite — keine App, kein Konto nötig. Sie bestätigt zwei getrennte Fakten: dass sich die Datei seit dem Versiegeln nicht verändert hat, und dass die versiegelnde Person eine echte Identitätsprüfung bestanden hat. Das ist eine echte Prüfmöglichkeit, kein bloßes Vertrauen darauf, dass eine E-Mail richtig aussieht.",
  },
];

export default function VerifiedBadgeInvoicesGuideDePage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/de">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Anmelden
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Für Freelancer &amp; Agenturen</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Anleitung zum Versiegeln &amp; Versenden</h1>
        <p className="max-w-xl text-base text-slate-600">
          Zwei Teile: einmalige Identitätsprüfung, und was bei jeder weiteren Rechnung passiert, die du versiegelst und versendest.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:gap-3 sm:text-sm">
          <Link
            href="#part-1"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              1
            </span>
            Verifizieren
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              2
            </span>
            Versiegeln
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              3
            </span>
            Versenden
          </Link>
        </div>

        <Image
          src="/hero-verified-badge-invoice.png"
          alt="Ein Verified Badge in der Ecke einer Freelancer-Rechnung — die SignedBy-Marke, ein scanbarer QR-Code und ein Verifizierungslink"
          width={640}
          height={820}
          className="mt-2 w-full max-w-xs rounded-xl border border-slate-200 shadow-lg"
          priority
        />
        <Link href="/de/verified-badge-invoices" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Zurück zu Verified Badge für Rechnungen
        </Link>
      </section>

      {/* Part 1 */}
      <section id="part-1" className="mx-auto w-full max-w-3xl px-6 pb-4 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Teil 1 — Deine Identität verifizieren (nur einmal)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Dein allererstes Verified-Badge-Siegel enthält eine einmalige Identitätsprüfung. Alles danach sind nur noch zwei Klicks.
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
          <h3 className="text-base font-semibold text-slate-900">Gut zu wissen</h3>
          <p className="mt-2 text-sm text-slate-600">
            Die Identitätsprüfung gilt für die ganze Organisation, nicht pro Dokument — jeder aus deinem Team, der später ein Dokument versiegelt, nutzt dieselbe verifizierte Prüfung, sobald er sie selbst einmal gemacht hat. Der Free-Tarif umfasst 3 Verified-Badge-Siegel im Monat; ab Pro-Tarif ist das Versiegeln unbegrenzt, ohne Gebühr pro Siegel.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section id="part-2" className="mx-auto w-full max-w-3xl px-6 py-10 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Teil 2 — Eine Rechnung versiegeln und versenden, jedes Mal</h2>
        <p className="mt-2 text-sm text-slate-600">Das passiert tatsächlich, sobald du verifiziert bist und eine echte Rechnung versenden willst.</p>

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
          <h3 className="text-base font-semibold text-slate-900">Gut zu wissen</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Ein Verified Badge beweist, dass deine Rechnung unverändert existierte, mit einem kryptografisch verifizierten Zeitstempel, versiegelt von einer identitätsverifizierten Person — eine echte, nützliche, andere Aussage als „das sieht legitim aus“. Es hindert niemanden daran, eine andere Rechnung zu fälschen, und das behauptet es auch nicht.
            </li>
            <li>
              Möchtest du die Originaldatei komplett unangetastet lassen? Nutze stattdessen die Zertifikat-Ausgabe statt des Badges — sie hinterlegt denselben Nachweis separat, statt das PDF selbst zu stempeln, was meist besser zu einem Datenraum passt als zu einer Rechnung, die du einem einzelnen Kunden gibst.
            </li>
            <li>
              Du kannst eine Datei auch über den Console-Chat oder die API statt über das Dashboard versiegeln — sieh dir die{" "}
              <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
                Entwicklerdokumentation
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">SignedBy kostenlos testen</h2>
        <p className="mt-2 text-sm text-slate-600">3 Verified-Badge-Siegel im Monat, keine Kreditkarte, nur bei Bedarf upgraden.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color="purple" page="verified-badge-invoices-guide-de" position="footer" variant="de">
          Jetzt Verified Badge holen →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/de/verified-badge-invoices" className="hover:text-slate-600">
            Verified Badge für Rechnungen
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Kostenlose Vorlagen
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
