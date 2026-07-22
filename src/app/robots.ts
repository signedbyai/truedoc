import type { MetadataRoute } from "next";

// Dashboard/API/sign-token/auth routes are all per-user or session-specific
// -- nothing there should ever be crawled or indexed, both for privacy (a
// signing link is a bearer token, not something that should turn up in
// search results) and because none of it is meant to rank.
//
// DEV_ACCESS_ALLOWLIST (see dev-access.ts) doubles as the "which environment
// am I" signal here: it's only ever set on the dev preview subdomain, never
// in production. Reusing it means this file needs no separate env var --
// dev.signedby.ai gets a blanket disallow instead of the production rules,
// so the whole preview (not just /dashboard) stays out of search indexes
// while it's mid-redesign and not meant to be found.
export default function robots(): MetadataRoute.Robots {
  if (process.env.DEV_ACCESS_ALLOWLIST) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/sign", "/team", "/auth", "/login"],
    },
    sitemap: "https://signedby.ai/sitemap.xml",
  };
}
