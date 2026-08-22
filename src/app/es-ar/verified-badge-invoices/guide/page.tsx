import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Local-language (ES-AR) translation of /verified-badge-invoices/guide
// — 2026-08-22, direct ask, once the locale invoice pages (/es-ar/verified-badge-invoices
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
const TITLE = "Cómo sellar facturas con Verified Badge — Guía | SignedBy";
const DESCRIPTION =
  "Paso a paso: verificá tu identidad una vez, y después sellá y etiquetá cada factura que envíes — qué ves vos, y qué ve tu cliente cuando la escanea.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/es-ar/verified-badge-invoices/guide" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/es-ar/verified-badge-invoices/guide" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SIGNUP_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_invoice_guide_es_ar&utm_medium=cta&utm_campaign=verified_badge_invoice_page_es_ar";

type GuideStep = {
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  body: string;
};

const SETUP_STEPS: GuideStep[] = [
  {
    title: "Abrí la pestaña Verified Badge",
    image: "/guide-badge-invoice-start-badge-tab.png",
    imageWidth: 1170,
    imageHeight: 1200,
    body: "Panel → Nuevo Documento → pestaña Verified Badge. Es un camino separado de la pestaña Firmar — no hay destinatario que agregar ni nada que firmar, solo un archivo para sellar.",
  },
  {
    title: "Elegí el PDF de tu factura",
    image: "/guide-badge-invoice-upload-first-invoice.png",
    imageWidth: 1170,
    imageHeight: 1000,
    body: "Solo PDF. Si tu factura sale de tu software de contabilidad en otro formato, exportala o imprimila a PDF primero. Ponele un título y tocá Sellar este archivo.",
  },
  {
    title: "Verificá tu identidad (una vez)",
    image: "/guide-badge-invoice-verify-identity.png",
    imageWidth: 1170,
    imageHeight: 650,
    body: "Tu primer sello necesita un control de documento de identidad, alojado por Stripe y que normalmente lleva menos de un minuto. Cada sello siguiente lo reutiliza automáticamente — no vas a volver a ver esta pantalla.",
  },
  {
    title: "Ya está sellado",
    image: "/guide-badge-invoice-sealed-first.png",
    imageWidth: 1170,
    imageHeight: 700,
    body: "SignedBy hashea el archivo, le pone marca de tiempo con una Autoridad de Sellado de Tiempo real (Sectigo, con EuroTSA y después FreeTSA como respaldo automático), y genera tu insignia — y después te lleva directo a la página del documento.",
  },
];

const FLOW_STEPS: GuideStep[] = [
  {
    title: "Sellá la próxima factura",
    image: "/guide-badge-invoice-seal-next-invoice.png",
    imageWidth: 1170,
    imageHeight: 950,
    body: "Misma pestaña, mismos dos pasos — elegí el archivo, tocá Sellar este archivo. Esta vez sin control de identidad; eso es un costo único, no por factura.",
  },
  {
    title: "Tus archivos de salida están listos",
    image: "/guide-badge-invoice-outputs-ready.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Cada sello te da una imagen de Insignia, un PDF sellado, un Certificado y una copia/QR del link de verificación — todo en la página propia del documento, en tu panel. Para una factura, la imagen de Insignia es la que conviene usar: una pequeña marca que ponés directo en el archivo, sin nada más que gestionar.",
  },
  {
    title: "Poné la insignia en tu factura",
    image: "/hero-verified-badge-invoice.png",
    imageWidth: 640,
    imageHeight: 820,
    body: "Pegá la imagen de la insignia en una esquina de tu factura antes de enviarla — igual que un logo. Lleva el código QR, la marca de SignedBy y un link de verificación corto en texto plano, así se ve legítimo incluso impreso o en una captura de pantalla.",
  },
  {
    title: "Tu cliente la escanea",
    image: "/guide-badge-invoice-client-verifies.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Su cámara abre la página de verificación directamente — sin app, sin cuenta. Confirma dos datos separados: que el archivo no cambió desde que se selló, y que quien lo selló pasó un control de identidad real. Es una forma real de comprobarlo, no solo confiar en que un mail se ve bien.",
  },
];

export default function VerifiedBadgeInvoicesGuideEsArPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/es-ar">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Iniciar sesión
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Para freelancers y agencias</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Guía de sellado y envío</h1>
        <p className="max-w-xl text-base text-slate-600">
          Dos partes: verificar tu identidad una vez, y qué pasa realmente cada vez que sellás y enviás una factura después de eso.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:gap-3 sm:text-sm">
          <Link
            href="#part-1"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              1
            </span>
            Verificar
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              2
            </span>
            Sellar
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              3
            </span>
            Enviar
          </Link>
        </div>

        <Image
          src="/hero-verified-badge-invoice.png"
          alt="Una insignia Verified Badge estampada en la esquina de una factura de freelancer — la marca de SignedBy, un código QR escaneable y un link de verificación"
          width={640}
          height={820}
          className="mt-2 w-full max-w-xs rounded-xl border border-slate-200 shadow-lg"
          priority
        />
        <Link href="/es-ar/verified-badge-invoices" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Volver a Verified Badge para facturas
        </Link>
      </section>

      {/* Part 1 */}
      <section id="part-1" className="mx-auto w-full max-w-3xl px-6 pb-4 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Parte 1 — Verificar tu identidad (una sola vez)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tu primer sello de Verified Badge incluye una verificación de identidad única. Todo lo que sigue son solo dos clics.
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
          <h3 className="text-base font-semibold text-slate-900">Bueno saberlo</h3>
          <p className="mt-2 text-sm text-slate-600">
            El control de identidad es a nivel organización, no por documento — cualquiera de tu equipo que selle un documento más adelante reutiliza el mismo control verificado, una vez que lo hizo por su cuenta. El plan Free incluye 3 sellos Verified Badge por mes; el plan Pro o superior tiene sellado ilimitado, sin cargo por sello.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section id="part-2" className="mx-auto w-full max-w-3xl px-6 py-10 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Parte 2 — Sellar y enviar una factura, cada vez</h2>
        <p className="mt-2 text-sm text-slate-600">Esto es lo que pasa en la práctica una vez que estás verificado y es momento de enviar una factura real.</p>

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
          <h3 className="text-base font-semibold text-slate-900">Bueno saberlo</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Un Verified Badge demuestra que tu factura existió, sin alteraciones, con una marca de tiempo verificada criptográficamente, sellada por una persona con identidad verificada — una afirmación real y útil, distinta de &quot;esto parece legítimo&quot;. No impide que alguien falsifique otra factura, y no dice hacerlo.
            </li>
            <li>
              ¿Preferís dejar el archivo original completamente intacto? Usá el Certificado en lugar de la insignia — registra la misma prueba por separado en vez de sellar el PDF en sí, algo que suele quedar mejor para un dataroom que para una factura que le das a un solo cliente.
            </li>
            <li>
              También podés sellar un archivo desde el chat de Console o la API en vez del panel — mirá la{" "}
              <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
                documentación para desarrolladores
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Probá SignedBy gratis</h2>
        <p className="mt-2 text-sm text-slate-600">3 sellos Verified Badge por mes, sin tarjeta, actualizá el plan solo si necesitás más.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color="purple" page="verified-badge-invoices-guide-es-ar" position="footer" variant="es-ar">
          Conseguí tu Verified Badge ahora →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/es-ar/verified-badge-invoices" className="hover:text-slate-600">
            Verified Badge para facturas
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Plantillas gratis
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Precios
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Términos
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacidad
          </Link>
        </p>
      </footer>
    </main>
  );
}
