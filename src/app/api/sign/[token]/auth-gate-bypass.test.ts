import { describe, expect, it, vi } from "vitest";

// Regression test for the 2026-07-25 audit finding (see
// DOCUMENT_DELIVERY_SECURITY_AUDIT.md): per-recipient email-OTP verification
// (signer.auth_required / auth_verified_at, PER_RECIPIENT_AUTH_SCOPE.md) used
// to be enforced ONLY inside src/app/sign/[token]/page.tsx's server
// component. Every one of the underlying data API routes that page's client
// components call (GET .../file, GET .../signed-file, POST .../submit, POST
// .../decline, GET .../status, GET .../summary, POST .../payment-click, POST
// .../client-error) called the exact same getSignerByToken() helper but
// never re-checked auth_required/auth_verified_at itself — so anyone with a
// signer's raw signing_token could bypass the OTP challenge entirely via
// direct API calls (curl, fetch, a script). Confirmed with a real
// reproduction before the fix (both routes below returned 200 with real data
// for an unverified signer).
//
// The bare GET /api/sign/[token] (labeled "(view)" in this file's earlier
// history) was removed 2026-08-07 as confirmed-dead code — it duplicated
// page.tsx's own view/webhook logic, and nothing in the app ever called it
// (see MASTER_BACKLOG.md's "Remove dead GET handler" item). Its two test
// cases here were removed alongside it, not just left pointing at a route
// that no longer exists.
//
// Any NEW signer-facing /api/sign/[token]/... route must add a case here too
// — this file is the single place that would catch a route forgetting the
// guard, exactly how the original bug happened.
//
// Fixed by src/lib/signing.ts's requireVerifiedSigner(), called at the top
// of every affected route right after getSignerByToken(). This test now
// asserts the gate actually blocks an unverified signer (401) AND that a
// verified signer still gets normal access (200) — so a future edit that
// removes the guard, or a new route that forgets to add it, would be caught
// here.

const unverifiedSigner = {
  id: "signer-1",
  document_id: "doc-1",
  name: "Daniil Potapov",
  email: "daniil@example.com",
  order_index: 0,
  status: "sent" as string,
  signed_at: null as string | null,
  docgate_code: "gate-1",
  auth_required: true,
  auth_verified_at: null as string | null,
};

const verifiedSigner = { ...unverifiedSigner, auth_verified_at: "2026-07-25T12:00:00.000Z" };

const baseDocument = {
  id: "doc-1",
  title: "Buzz_Michael_Eagles_Advisory_v3-2",
  page_count: 8,
  org_id: "org-1",
  owner_id: "owner-1",
  status: "sent" as string,
  payment_link_url: null,
  payment_label: null,
  docgate_url: null,
  docgate_label: null,
  open_notifications: false,
};

// Minimal fluent Supabase-style builder: every method returns `this`, and
// `this` is thenable so `await admin.from(table).select(...).eq(...).single()`
// resolves to whatever fixed row this table was configured with. Good enough
// for the handful of admin.from(...) chains these routes make once
// getSignerByToken has already returned. Keyed by table name since e.g.
// file/route.ts needs a real `documents.file_path` row back, not an empty
// default.
function makeAdminStub(rowsByTable: Record<string, unknown> = {}) {
  return {
    from: (table: string) => {
      const row = rowsByTable[table] ?? null;
      const builder: Record<string, unknown> = {};
      const chain = (): unknown => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.order = chain;
      builder.update = chain;
      builder.insert = chain;
      builder.single = () => Promise.resolve({ data: row, error: null });
      builder.then = (resolve: (v: { data: unknown[]; error: null; count: number }) => void) =>
        resolve({ data: row ? [row] : [], error: null, count: row ? 1 : 0 });
      return builder;
    },
  };
}

let currentSigner = unverifiedSigner;

vi.mock("@/lib/signing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/signing")>("@/lib/signing");
  return {
    ...actual,
    getSignerByToken: vi.fn(async () => ({
      admin: makeAdminStub({ documents: { file_path: "org-1/doc-1/original.pdf" } }),
      signer: { ...currentSigner },
      document: { ...baseDocument },
    })),
    fetchSignerSpeedStat: vi.fn(async () => null),
  };
});

vi.mock("@/lib/r2", () => ({
  getFromR2: vi.fn(async () => ({
    body: Buffer.from("%PDF-1.4 fake pdf bytes"),
    contentType: "application/pdf",
  })),
}));

// submit/route.ts and decline/route.ts check the rate limit BEFORE calling
// getSignerByToken, and the real checkRateLimit() spins up a live Supabase
// admin client — irrelevant to what this test is verifying, and it throws
// in this environment with no Supabase env vars set. Stub it out so the
// auth-gate check (which runs right after) is what's actually exercised.
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => true),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

describe("per-recipient OTP gate — every route blocks an unverified signer", () => {
  it("GET /api/sign/[token]/file returns 401 for an unverified signer", async () => {
    currentSigner = unverifiedSigner;
    const { GET } = await import("./file/route");
    const res = await GET(new Request("https://signedby.ai/api/sign/tok/file"), {
      params: Promise.resolve({ token: "tok" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/sign/[token]/submit returns 401 for an unverified signer", async () => {
    currentSigner = unverifiedSigner;
    const { POST } = await import("./submit/route");
    const res = await POST(
      new Request("https://signedby.ai/api/sign/tok/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, values: {} }),
      }),
      { params: Promise.resolve({ token: "tok" }) }
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/sign/[token]/decline returns 401 for an unverified signer", async () => {
    currentSigner = unverifiedSigner;
    const { POST } = await import("./decline/route");
    const res = await POST(
      new Request("https://signedby.ai/api/sign/tok/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ token: "tok" }) }
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/sign/[token]/client-error returns 401 for an unverified signer", async () => {
    currentSigner = unverifiedSigner;
    const { POST } = await import("./client-error/route");
    const res = await POST(
      new Request("https://signedby.ai/api/sign/tok/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "boom" }),
      }),
      { params: Promise.resolve({ token: "tok" }) }
    );
    expect(res.status).toBe(401);
  });
});

describe("per-recipient OTP gate — a verified signer keeps normal access", () => {
  it("GET /api/sign/[token]/file still streams the PDF once auth_verified_at is set", async () => {
    currentSigner = verifiedSigner;
    const { GET } = await import("./file/route");
    const res = await GET(new Request("https://signedby.ai/api/sign/tok/file"), {
      params: Promise.resolve({ token: "tok" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("POST /api/sign/[token]/client-error still logs the event once auth_verified_at is set", async () => {
    currentSigner = verifiedSigner;
    const { POST } = await import("./client-error/route");
    const res = await POST(
      new Request("https://signedby.ai/api/sign/tok/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Timed out after 20000ms", stage: "TimeoutError" }),
      }),
      { params: Promise.resolve({ token: "tok" }) }
    );
    expect(res.status).toBe(200);
  });
});
