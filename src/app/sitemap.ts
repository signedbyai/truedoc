import type { MetadataRoute } from "next";
import { TEMPLATE_PAGES } from "@/lib/template-pages";

// Public, indexable marketing pages only -- dashboard/*, sign/[token],
// team/accept/[token], auth/*, and api/* are all per-user or dynamic and
// excluded here (and blocked in robots.ts) rather than listed with
// low priority, since none of them are meant to rank at all.
const BASE_URL = "https://signedby.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/vs/signnow`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/vs/docusign`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Was built but never listed here — added 2026-07-18.
    { url: `${BASE_URL}/vs/hix`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Programmatic-SEO template pages, added 2026-07-21 (see the DocuSign/
    // SignNow GTM research this was modeled on) — one per AI Drafter
    // document type, index page plus each individual /templates/[slug].
    { url: `${BASE_URL}/templates`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...TEMPLATE_PAGES.map((t) => ({
      url: `${BASE_URL}/templates/${t.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Trust/procurement page: what the audit trail records, how documents are
    // protected, and the ESIGN/UETA position. Indexable (unlike /privacy,
    // /terms, /dpa) — it's a page we actively want found.
    { url: `${BASE_URL}/security`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/verify`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // /privacy, /terms, /dpa, /referral-terms are intentionally excluded — noindexed
    // (see each page's metadata). Listing a noindexed page in the sitemap
    // sends Google mixed signals, so they're left out entirely.
  ];
}
