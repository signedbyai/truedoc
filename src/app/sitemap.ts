import type { MetadataRoute } from "next";

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
    { url: `${BASE_URL}/verify`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/dpa`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
