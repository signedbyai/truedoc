import type { MetadataRoute } from "next";

// Dashboard/API/sign-token/auth routes are all per-user or session-specific
// -- nothing there should ever be crawled or indexed, both for privacy (a
// signing link is a bearer token, not something that should turn up in
// search results) and because none of it is meant to rank.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/sign", "/team", "/auth", "/login"],
    },
    sitemap: "https://signedby.ai/sitemap.xml",
  };
}
