import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Peninsular Spanish (Spain, tuteo) companion to /verified-badge-invoices —
// 2026-08-22, direct ask, sibling to es-ar/verified-badge-invoices/page.tsx
// (Argentina, voseo). Every voseo verb form in the AR copy (sellá, demostrá,
// conseguí...) is converted to tuteo (sella, demuestra, consigue) here — see
// homepage-es-es.tsx's comment for why that conversion matters for a Spain
// audience. See [[site-localization-scope-2026-08-20]].
//
// Same "tests LANGUAGE not CTA copy" simplification as the AR page: single
// fixed layout/copy, no flags-system CTA variant test. Same two non-negotiable
// honesty rules as every other Verified Badge asset: never claim this "stops
// fraud" or guarantees a scam can't happen — it proves a specific file
// existed, unaltered, as of a verified timestamp, sealed by an
// identity-verified person; and don't overstate what AI-generated fake
// invoices are doing today.
const TITLE = "Verified Badge — demuestra que tu factura es realmente tuya, no una falsificación con IA | SignedBy";
const DESCRIPTION =
  "Sella tu factura como inalterada y con identidad verificada antes de enviarla. Tu cliente escanea un código y sabe al instante que es realmente tuya. Gratis para empezar, sin tarjeta.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/es-es/verified-badge-invoices" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/es-es/verified-badge-invoices" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Same dashboard-native flow as the EN page's START_HREF, utm_campaign
// changed so this page's signups are attributable separately — same
// reasoning as [[signup-attribution]].
const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_es_es&utm_medium=cta&utm_campaign=verified_badge_invoice_page_es_es";

const FAQ = [
  {
    q: "¿Esto evita que alguien falsifique mi factura?",
    a: "No — y no dice hacerlo. Un Verified Badge demuestra que tu factura real existió, sin alteraciones, con una marca de tiempo verificada criptográficamente, sellada por una persona con identidad verificada. Eso le da a tu cliente una forma real de comprobarlo en vez de solo confiar en que el mail se ve bien — no es una garantía de que nada malo pueda pasar.",
  },
  {
    q: "¿Qué ve realmente el cliente?",
    a: "Una insignia en tu factura — un código QR, la marca de SignedBy y un link de verificación como texto plano, así se ve legítimo incluso impreso o en una captura de pantalla. Al escanearlo o visitarlo llega a una página pública: tu nombre, cuándo se selló el archivo y confirmación de que no fue alterado desde entonces. No hace falta cuenta ni inicio de sesión para verificarlo.",
  },
  {
    q: "¿Y si mi verificación de identidad es vieja?",
    a: "Tu primer sello verifica tu identidad con un control de documento de identidad (un minuto, alojado por Stripe). Los sellos siguientes reutilizan esa misma verificación en vez de volver a escanear tu documento cada vez — más rápido y más barato. La página pública siempre muestra \"identidad verificada el [fecha]\" junto con \"sellado el [fecha]\" como dos datos separados, así queda claro si la verificación de identidad es anterior a este sello en particular.",
  },
  {
    q: "¿Funciona con archivos que no son PDF?",
    a: "Por ahora, solo PDF. Si tu factura sale de tu software de contabilidad en otro formato, expórtala o imprímela a PDF primero, y después sella ese archivo.",
  },
  {
    q: "¿Qué plan necesito?",
    a: "Cualquier plan, incluido Free, sin tarjeta. Free incluye 3 sellos Verified Badge por mes. El plan Pro o superior tiene sellado ilimitado, sin cargo por sello. Sella un archivo directamente desde el menú de Nuevo Documento de tu panel — los desarrolladores también pueden hacerlo desde el chat de Console o la API, ver la documentación para desarrolladores.",
  },
  {
    q: "¿Qué hace que la marca de tiempo sea \"verificada criptográficamente\"?",
    a: "Cada sello se envía a una Autoridad de Sellado de Tiempo real (el servicio público RFC 3161 de Sectigo, con EuroTSA y después FreeTSA como respaldo automático si Sectigo no responde) que firma el hash del archivo junto con la hora. Cualquiera puede verificarlo de forma independiente, confiando solo en la autoridad de sellado — no solo en una fecha en la base de datos de SignedBy. La página pública en signedby.ai/verify muestra qué autoridad respaldó un sello en particular.",
  },
];

export default function VerifiedBadgeInvoicesEsEsPage() {
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
        <Link href="/es-es">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Iniciar sesión
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          La IA puede falsificar una factura en segundos. Demuestra que la tuya es realmente tuya.{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Un estafador hoy puede armar una factura falsa muy convincente con tu nombre y tu marca, y enviársela
          a uno de tus clientes en segundos. Sella primero tu factura real: un hash y una prueba con identidad
          verificada de lo que realmente enviaste, para que tu cliente pueda comprobarlo antes de pagar.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Asegura tu factura gratis
            <span
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-emerald-200 bg-emerald-50"
              aria-hidden="true"
            />
          </div>
          <CtaLink href={START_HREF} color="purple" page="verified-badge-invoices-es-es" position="hero" variant="es-es">
            Consigue tu Verified Badge ahora →
          </CtaLink>
          <p className="text-xs text-slate-400">Gratis para empezar, sin tarjeta — lleva alrededor de un minuto.</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="relative w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
            <Image
              src="/hero-verified-badge-invoice.png"
              alt="Una insignia Verified Badge estampada en la esquina de una factura de freelancer — la marca de SignedBy, un código QR escaneable y un link de verificación"
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
        <h2 className="text-lg font-semibold text-slate-900">Cómo funciona</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Verifícate una vez",
              body: "Un control de documento de identidad, una sola vez (un minuto, alojado por Stripe). Se reutiliza en cada sello futuro — no hace falta volver a escanear tu documento cada vez.",
            },
            {
              step: "2. Sella la factura",
              body: "Sube el PDF de tu factura terminada desde tu panel — SignedBy la hashea, le pone marca de tiempo y genera tu insignia.",
            },
            {
              step: "3. Inserta la insignia",
              body: "Pon la insignia en tu factura antes de enviarla. El cliente la escanea y llega a una página pública — sin necesidad de cuenta.",
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
          <h3 className="text-base font-semibold text-slate-900">¿Recién llegas a SignedBy? Lee la guía de sellado y envío</h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Paso a paso: verifica tu identidad una vez, y exactamente qué pasa cada vez que sellas y envías una
            factura después de eso.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
            Leer la guía →
          </span>
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">Qué demuestra realmente esto</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Un Verified Badge es una prueba de procedencia e integridad, no una herramienta de detección de fraude.
          Confirma que este archivo exacto existió, sin alteraciones, con una marca de tiempo verificada
          criptográficamente, sellado por una persona con identidad verificada — una afirmación real y útil,
          distinta de &ldquo;esto parece legítimo&rdquo;. Un planteo honesto a propósito: exagerar acá le
          restaría valor a lo único que realmente se sostiene bajo escrutinio.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Asegura tu factura gratis</h2>
        <p className="mt-2 text-sm text-slate-600">
          Gratis para empezar — 3 sellos por mes incluidos, sin tarjeta. ¿Necesitas más? El plan Pro o superior
          tiene sellado ilimitado, sin cargo por sello.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color="purple" page="verified-badge-invoices-es-es" position="footer" variant="es-es">
          Consigue tu Verified Badge ahora →
        </CtaLink>
      </section>

      <section className="mx-auto w-full max-w-3xl pb-12 px-6">
        <h2 className="text-lg font-semibold text-slate-900">Preguntas frecuentes</h2>
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
          También en SignedBy:{" "}
          <Link href="/console" className="underline underline-offset-2 hover:text-slate-900">
            Console
          </Link>{" "}
          ·{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/verify" className="underline underline-offset-2 hover:text-slate-900">
            Verificar un documento
          </Link>{" "}
          ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
            Documentación de la API y MCP
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/verified-badge-invoices/guide" className="hover:text-slate-600">
            Guía de sellado y envío
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
