import { NextResponse } from "next/server";

// RFC 9727 API Catalog -- a machine-readable index pointing agents at
// SignedBy's two real public API surfaces (both already live and
// documented on /developers: REST at /api/v1/*, MCP at /api/mcp). Static
// data, no per-request logic, so a plain route handler with an explicit
// content-type is simpler and more reliable than a static /public file
// (unknown extensions in /public get served with an unpredictable
// content-type, and the linkset+json type matters here -- see the isitagentready.com
// scan, 2026-08-06, which explicitly checks for it).
//
// Deliberately no "service-desc" entries: that relation is for a formal
// machine-readable spec (OpenAPI JSON, etc.), which doesn't exist yet --
// only "service-doc" (human/agent-readable documentation) is linked, since
// that's the only thing actually true today. /developers.md (added
// 2026-08-06, same pass) is a real markdown transcription of /developers,
// not a stand-in -- both are listed since they're both live.
const catalog = {
  linkset: [
    {
      anchor: "https://signedby.ai/api/v1",
      "service-doc": [
        { href: "https://signedby.ai/developers", type: "text/html" },
        { href: "https://signedby.ai/developers.md", type: "text/markdown" },
      ],
    },
    {
      anchor: "https://signedby.ai/api/mcp",
      "service-doc": [{ href: "https://signedby.ai/developers#mcp", type: "text/html" }],
    },
  ],
};

export async function GET() {
  return NextResponse.json(catalog, { headers: { "Content-Type": "application/linkset+json" } });
}
