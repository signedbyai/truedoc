import { describe, expect, it, vi } from "vitest";

// CRITICAL SECURITY FINDING (audited 2026-07-25, see
// DOCUMENT_DELIVERY_SECURITY_AUDIT.md): per-recipient email-OTP verification
// (signer.auth_required / auth_verified_at, PER_RECIPIENT_AUTH_SCOPE.md) is
// enforced ONLY inside src/app/sign/[token]/page.tsx's server component — the
// line `if (signer.auth_required && !signer.auth_verified_at) return
// <SignerAuthGate .../>`. Every one of the underlying data API routes that
// the signing page's own client components call (GET .../view, GET .../file,
// GET .../signed-file, POST .../submit, POST .../decline, GET .../status, GET
// .../summary, POST .../payment-click) calls the exact same getSignerByToken()
// helper but never re-checks auth_required/auth_verified_at itself.
//
// That means the OTP gate is a UI skin, not an access control: anyone who has
// a signer's raw signing_token (whether they were sent it, guessed it, or it
// was forwarded/shared) can call these routes directly — with curl, fetch, or
// a script — and view the document, read the AI summary, and fully sign or
// decline it, without ever completing the email code challenge the sender
// explicitly turned on for that recipient.
//
// This test builds a signer fixture with auth_required: true and
// auth_verified_at: null (an org that turned on per-recipient verification,
// for a recipient who has NOT yet passed it) and calls the real route
// handlers directly. It currently documents the bypass by asserting the
// routes still return 200 with real data. Once the shared guard proposed in
// the audit doc is added, these assertions should be flipped to expect a 401
// so this becomes a regression test instead of a bug report.

const baseSigner = {
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
// getSignerByToken has already returned — we're proving the auth gate is
// missing, not exercising every downstream write. Keyed by table name since
// e.g. file/route.ts needs a real `documents.file_path` row back, not an
// empty default.
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

vi.mock("@/lib/signing", () => ({
  getSignerByToken: vi.fn(async () => ({
    admin: makeAdminStub({ documents: { file_path: "org-1/doc-1/original.pdf" } }),
    signer: { ...baseSigner },
    document: { ...baseDocument },
  })),
  fetchSignerSpeedStat: vi.fn(async () => null),
}));

vi.mock("@/lib/r2", () => ({
  getFromR2: vi.fn(async () => ({
    body: Buffer.from("%PDF-1.4 fake pdf bytes"),
    contentType: "application/pdf",
  })),
}));

describe("per-recipient OTP gate — bypass via direct API calls", () => {
  it("GET /api/sign/[token]/view returns the document's fields with no auth_verified_at check", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("https://signedby.ai/api/sign/tok"), {
      params: Promise.resolve({ token: "tok" }),
    });
    // This is the bug: an unverified recipient's raw signing_token is enough
    // to read back the document title and field list, the same content the
    // OTP gate exists to withhold until the code challenge passes.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document.title).toBe(baseDocument.title);
  });

  it("GET /api/sign/[token]/file streams the actual PDF bytes with no auth_verified_at check", async () => {
    const { GET } = await import("./file/route");
    const res = await GET(new Request("https://signedby.ai/api/sign/tok/file"), {
      params: Promise.resolve({ token: "tok" }),
    });
    // The signer never saw the OTP screen resolve, yet the raw signed PDF
    // bytes come back with a 200 and the right content type — the exact
    // "8 expected pages" document a verified signer would see.
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });
});
