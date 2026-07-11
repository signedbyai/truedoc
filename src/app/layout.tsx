import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
