import type { NextConfig } from "next";

// Content-Security-Policy scoped to what this app actually loads:
// - Supabase browser client talks to https://*.supabase.co (REST/Auth, plus
//   realtime over wss:// if that's ever turned on).
// - PDF pages and signatures are rendered to <img> as data: URLs; pdf.js runs
//   as a same-origin worker (public/pdf.worker.min.mjs) and may use WASM.
// - Stripe Checkout/portal is a full top-level redirect (window.location.href
//   to a Stripe-hosted URL) set from our own API responses, not a fetch/XHR
//   or <form> post to stripe.com — so it isn't governed by connect-src or
//   form-action and needs no extra allowance here.
// 'unsafe-inline' stays in script-src because Next's App Router injects
// inline hydration/RSC payload scripts; making this strict requires a
// nonce wired through middleware, which is a further hardening step, not
// a blocker.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // pdfjs-dist (server-side PDF text extraction, see src/lib/pdf-text.ts)
  // ships as a large pre-built .mjs and does its own dynamic requires
  // internally. Marking it external tells Next to leave it as a plain
  // node_modules require instead of trying to bundle it, which is what lets
  // it actually be traced into the API route's serverless function bundle.
  // (We previously also depended on @napi-rs/canvas here for a native
  // DOMMatrix polyfill; that native binary wasn't reliably traced into the
  // Vercel function bundle even with this setting, so it was replaced with
  // a pure-JS polyfill in pdf-text.ts instead — see the comment there.)
  serverExternalPackages: ["pdfjs-dist"],
  // pdfjs-dist's Node code path falls back to a same-process "fake worker"
  // by dynamically `import()`-ing a *runtime-computed* path
  // (GlobalWorkerOptions.workerSrc, defaulted internally to
  // "./pdf.worker.mjs" relative to pdf.mjs). Vercel's build-time file
  // tracer (@vercel/nft) only follows statically-analyzable import
  // specifiers, so it never discovers this dynamic import and leaves
  // pdf.worker.mjs out of the deployed function bundle. That's the actual
  // cause of "Could not read this document" recurring on unrelated PDFs —
  // confirmed via production logs: "Setting up fake worker failed: Cannot
  // find module '/var/task/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'".
  // (The Path2D/@napi-rs/canvas warnings logged alongside it are harmless —
  // pdfjs only needs those for actual canvas rendering, which text
  // extraction never does.) Force-including the file here is the fix.
  // Key must be a glob, not a literal route: `[token]` in a literal string
  // gets parsed as a picomatch character class ("one of t/o/k/e/n"), which
  // never matches, so the include silently doesn't apply. `*` matches the
  // dynamic segment instead.
  outputFileTracingIncludes: {
    "/api/sign/*/summary": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    // suggest-fields also calls into pdfjs-dist (positioned text extraction
    // for AI field placement, src/lib/suggest-fields.ts) — same gap, same fix.
    "/api/documents/*/suggest-fields": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
