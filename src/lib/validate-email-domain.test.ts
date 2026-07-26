import { describe, it, expect, vi, beforeEach } from "vitest";

const resolveMx = vi.fn();
vi.mock("dns", () => ({
  promises: { resolveMx: (...args: unknown[]) => resolveMx(...args) },
}));

import { checkEmailDomainHasMx } from "./validate-email-domain";

describe("checkEmailDomainHasMx", () => {
  beforeEach(() => {
    resolveMx.mockReset();
  });

  it("passes when the domain has MX records", async () => {
    resolveMx.mockResolvedValue([{ exchange: "mail.example.com", priority: 10 }]);
    const result = await checkEmailDomainHasMx("signer@example.com");
    expect(result.ok).toBe(true);
  });

  it("flags a domain with zero MX records", async () => {
    resolveMx.mockResolvedValue([]);
    const result = await checkEmailDomainHasMx("signer@example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/example\.com/);
  });

  it("flags a domain that doesn't exist (ENOTFOUND)", async () => {
    const err = Object.assign(new Error("not found"), { code: "ENOTFOUND" });
    resolveMx.mockRejectedValue(err);
    const result = await checkEmailDomainHasMx("signer@gmial.con");
    expect(result.ok).toBe(false);
  });

  it("flags a domain with no data (ENODATA)", async () => {
    const err = Object.assign(new Error("no data"), { code: "ENODATA" });
    resolveMx.mockRejectedValue(err);
    const result = await checkEmailDomainHasMx("signer@example.com");
    expect(result.ok).toBe(false);
  });

  it("fails open on an unrelated resolver error", async () => {
    const err = Object.assign(new Error("network hiccup"), { code: "ECONNREFUSED" });
    resolveMx.mockRejectedValue(err);
    const result = await checkEmailDomainHasMx("signer@example.com");
    expect(result.ok).toBe(true);
  });

  it("fails open on a slow lookup that times out", async () => {
    vi.useFakeTimers();
    try {
      resolveMx.mockReturnValue(new Promise(() => {})); // never resolves
      const pending = checkEmailDomainHasMx("signer@example.com");
      await vi.advanceTimersByTimeAsync(3000);
      const result = await pending;
      expect(result.ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails open on malformed input with no domain part", async () => {
    const result = await checkEmailDomainHasMx("not-an-email");
    expect(result.ok).toBe(true);
    expect(resolveMx).not.toHaveBeenCalled();
  });
});
