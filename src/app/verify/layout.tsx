import type { Metadata } from "next";

const TITLE = "Verify a document — SignedBy";
const DESCRIPTION =
  "Independently confirm a SignedBy document is genuine by checksum. No account or login needed.";

// verify/page.tsx is a client component ("use client", for useSearchParams
// and local state), and client components can't export `metadata` -- Next
// only reads that export from server components. This layout is the
// server-side wrapper that makes the export possible. No openGraph/twitter
// override here, so /verify still inherits the root layout's
// opengraph-image.tsx automatically (see the comment in
// src/app/vs/signnow/page.tsx for the gotcha this sidesteps).
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/verify" },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
