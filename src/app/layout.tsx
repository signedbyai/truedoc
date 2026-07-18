import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AttributionCapture } from "@/components/attribution-capture";

// Intentionally using the system font stack (see globals.css) instead of
// next/font/google — one less external network dependency at build time,
// and it renders instantly with zero font-loading flash.

const TITLE = "SignedBy — Simple e-signatures without the per-seat tax";
const DESCRIPTION =
  "SignedBy is a lean, affordable e-signature tool for solo professionals and small teams. Upload, send, and sign in minutes — legally binding under ESIGN and UETA.";

export const metadata: Metadata = {
  metadataBase: new URL("https://signedby.ai"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://signedby.ai",
    siteName: "SignedBy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Organization + WebSite + SoftwareApplication entity signals so Google can
// resolve "SignedBy" to signedby.ai (it was competing with an unrelated
// signed-by.nl for the brand query) and is more likely to show sitelinks.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://signedby.ai/#organization",
      name: "SignedBy",
      alternateName: ["SignedBy.ai", "signedby.ai"],
      url: "https://signedby.ai",
      logo: "https://signedby.ai/apple-icon.png",
      description: DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": "https://signedby.ai/#website",
      name: "SignedBy",
      url: "https://signedby.ai",
      publisher: { "@id": "https://signedby.ai/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "SignedBy",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://signedby.ai",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        <AttributionCapture />
        {children}
        {/* Vercel Web Analytics — cookieless, privacy-friendly pageview/visit
            counts across all sources. Beacons same-origin (/_vercel/insights),
            so no CSP connect-src change needed. Enable it in the Vercel
            project dashboard for data to flow. */}
        <Analytics />
      </body>
    </html>
  );
}
