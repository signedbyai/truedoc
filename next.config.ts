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
