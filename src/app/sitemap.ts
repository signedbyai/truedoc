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
    // Live, indexable, and linked from the homepage footer since it exists --
    // just never added here. Caught 2026-08-06 while building the API
    // catalog/MCP server card (which both point agents at this page).
    { url: `${BASE_URL}/developers`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/vs/signnow`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/vs/docusign`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Was built but never listed here — added 2026-07-18.
    { url: `${BASE_URL}/vs/hix`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Added 2026-07-21 — PandaDoc chosen over Adobe Sign/Dropbox Sign as the
    // next comparison page because it's the one with real growth momentum
    // (80% user growth, 63% revenue growth per PandaDoc's own reporting),
    // vs. Adobe Sign's installed-base-driven share and Dropbox Sign's
    // reported stagnation.
    { url: `${BASE_URL}/vs/pandadoc`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Added 2026-07-22 — BoloSign is a genuine SMB e-signature competitor
    // (unlike EvoTrust/Evrotrust, an EU qualified-trust-service provider
    // for national eID, which doesn't compete for the same buyer and was
    // skipped rather than forced into an apples-to-oranges comparison).
    { url: `${BASE_URL}/vs/bolosign`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Added 2026-08-01 — Adobe Acrobat Sign, the market's incumbent, was the
    // one major-competitor comparison page still missing.
    { url: `${BASE_URL}/vs/adobe`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/vs/dropbox`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
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
    // Feature-specific landing pages, added 2026-07-22 for LinkedIn ad
    // message-match — same priority tier as the template pages.
    { url: `${BASE_URL}/ai-drafter`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/magic-quote`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Vertical landing page, added 2026-08-01 — was missing from here
    // entirely (caught while checking whether the page's FAQ section had
    // sitemap coverage), same priority tier as the other feature/template
    // landing pages above.
    { url: `${BASE_URL}/board-resolutions`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Verified Badge pages -- /verified-badge and /verified-badge-invoices
    // were both live, linked, and indexable but missing from here entirely;
    // caught 2026-08-06 while adding /verified-badge-real-estate, the third
    // page in the same family (see that page's own top-of-file comment).
    { url: `${BASE_URL}/verified-badge`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/verified-badge-invoices`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/verified-badge-real-estate`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Audience landing page, added 2026-08-06 -- core signing product for
    // independent dealers/brokers/private sellers, speed angle not fraud
    // (see that page's own top-of-file comment for why).
    { url: `${BASE_URL}/auto-sales`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Vertical landing page, added 2026-08-07 alongside the watercraft_
    // rental template/AI-drafter type — same board-resolutions pattern.
    { url: `${BASE_URL}/boat-jet-ski-rental`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Setup/signing guide, added 2026-08-08, linked from that page's footer.
    { url: `${BASE_URL}/boat-jet-ski-rental/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Audience-specific entry-point pages, added 2026-07-27 to test AU
    // trades and US subcontractor market entry — same feature, localized
    // framing and FAQ (see each page's own top-of-file comment).
    { url: `${BASE_URL}/magic-quote/au-tradies`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/magic-quote/us-subcontractors`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/verify`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // /privacy, /terms, /dpa, /referral-terms are intentionally excluded — noindexed
    // (see each page's metadata). Listing a noindexed page in the sitemap
    // sends Google mixed signals, so they're left out entirely.
  ];
}
