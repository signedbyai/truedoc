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
      // /api/v1 and /api/mcp are carved out of the broader /api disallow
      // below (2026-08-06, agent-discoverability pass): they're SignedBy's
      // two real, documented public API surfaces (see /developers, the new
      // MCP server card, and the API catalog at /.well-known/api-catalog),
      // and both require an API key to do anything (401 without one), so
      // there's nothing sensitive exposed by letting a crawler/agent see the
      // path exists. The rest of /api -- internal routes never meant to be
      // probed or indexed -- stays disallowed. Longest-match wins per the
      // robots.txt spec, so these Allow entries take precedence over the
      // broader Disallow: /api below regardless of list order.
      allow: ["/", "/api/v1", "/api/mcp"],
      disallow: ["/dashboard", "/api", "/sign", "/team", "/auth", "/login"],
    },
    sitemap: "https://signedby.ai/sitemap.xml",
  };
}
