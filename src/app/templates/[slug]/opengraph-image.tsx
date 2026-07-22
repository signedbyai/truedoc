import { ImageResponse } from "next/og";
import { TEMPLATE_PAGES, findTemplatePage } from "@/lib/template-pages";

// Dynamic version of the /ai-drafter, /magic-quote, and /templates og
// images -- one per slug, reusing the same generateStaticParams as
// page.tsx in this segment so each of the 6 template pages gets its own
// preview card headline instead of all six sharing the generic
// /templates/opengraph-image.tsx.
export const alt = "Free document template — SignedBy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return TEMPLATE_PAGES.map((t) => ({ slug: t.slug }));
}

export default async function TemplateSlugOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = findTemplatePage(slug);
  // The eyebrow already says "FREE TEMPLATE", so the headline drops the
  // page's own "Free ... Template" wrapper text to avoid saying it twice --
  // e.g. h1 "Free Boiler Maintenance Agreement Template" renders here as
  // just "Boiler Maintenance Agreement". Falls back to the full h1 (or a
  // generic string) if that strip ever leaves nothing usable, e.g. a future
  // template page whose h1 doesn't follow the same "Free ... Template"
  // shape.
  const stripped = page?.h1.replace(/^Free\s+/, "").replace(/\s+Template$/, "");
  const headline = stripped && stripped.length > 0 ? stripped : page?.h1 ?? "Document Template";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "0 90px",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "#94a3b8" }}>
          FREE TEMPLATE
        </div>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            maxWidth: 1020,
            fontSize: 56,
            fontWeight: 700,
            color: "#0f172a",
            letterSpacing: -1.3,
            lineHeight: 1.15,
          }}
        >
          {headline}
        </div>
        <div style={{ marginTop: 40, fontSize: 28, fontWeight: 500, color: "#475569", display: "flex" }}>
          Real, complete, ready to use — copy it free, or customize with AI.
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            border: "2px solid #e2e8f0",
            color: "#334155",
            fontSize: 24,
            fontWeight: 600,
            padding: "16px 32px",
            borderRadius: 40,
            alignSelf: "flex-start",
          }}
        >
          signedby.ai/templates
        </div>
      </div>
    ),
    { ...size }
  );
}
