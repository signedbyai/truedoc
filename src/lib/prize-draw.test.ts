import { describe, expect, it } from "vitest";
import { monthStart, prizeProgress } from "./prize-draw";

const NOW = new Date("2026-07-19T12:00:00Z");
const thisMonth = new Date("2026-07-03T09:00:00Z");
const lastMonth = new Date("2026-06-28T09:00:00Z");

function signed(email: string, signedAt = thisMonth) {
  return { email, signedAt };
}

describe("prizeProgress", () => {
  it("counts one point per distinct recipient, not per document", () => {
    // The whole anti-gaming property. Ten documents to the same person is one
    // person choosing to sign, however many times you sent it.
    const p = prizeProgress({
      signed: [signed("a@acme.com"), signed("a@acme.com"), signed("a@acme.com")],
      now: NOW,
      threshold: 5,
    });
    expect(p.count).toBe(1);
  });

  it("treats differently-cased addresses as one person", () => {
    const p = prizeProgress({
      signed: [signed("Jane@Acme.com"), signed("jane@acme.com"), signed("  JANE@acme.com  ")],
      now: NOW,
      threshold: 5,
    });
    expect(p.count).toBe(1);
  });

  it("excludes the org's own members", () => {
    // Signing your own document is legitimate; it just can't buy a voucher.
    const p = prizeProgress({
      signed: [signed("me@myorg.com"), signed("real@client.com")],
      excludeEmails: ["ME@myorg.com"],
      now: NOW,
      threshold: 5,
    });
    expect(p.count).toBe(1);
  });

  it("ignores signatures from before this month", () => {
    const p = prizeProgress({
      signed: [signed("a@acme.com", lastMonth), signed("b@acme.com", thisMonth)],
      now: NOW,
      threshold: 5,
    });
    expect(p.count).toBe(1);
  });

  it("qualifies at exactly the threshold and reports remaining without going negative", () => {
    const five = ["a", "b", "c", "d", "e"].map((n) => signed(`${n}@acme.com`));
    const at = prizeProgress({ signed: five, now: NOW, threshold: 5 });
    expect(at.qualified).toBe(true);
    expect(at.remaining).toBe(0);

    const over = prizeProgress({ signed: [...five, signed("f@acme.com")], now: NOW, threshold: 5 });
    expect(over.qualified).toBe(true);
    expect(over.remaining).toBe(0);

    const under = prizeProgress({ signed: five.slice(0, 2), now: NOW, threshold: 5 });
    expect(under.qualified).toBe(false);
    expect(under.remaining).toBe(3);
  });

  it("starts from zero for an org with no signatures", () => {
    const p = prizeProgress({ signed: [], now: NOW, threshold: 5 });
    expect(p).toMatchObject({ count: 0, qualified: false, remaining: 5 });
  });

  it("skips blank emails rather than counting them as a recipient", () => {
    const p = prizeProgress({ signed: [signed(""), signed("  ")], now: NOW, threshold: 5 });
    expect(p.count).toBe(0);
  });
});

describe("monthStart", () => {
  it("returns the first instant of the current UTC month", () => {
    expect(monthStart(NOW).toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("handles the first day of a month without rolling backwards", () => {
    // A regression worth pinning: an off-by-one here would silently wipe every
    // signature collected on the 1st.
    const firstOfMonth = new Date("2026-08-01T00:30:00Z");
    expect(monthStart(firstOfMonth).toISOString()).toBe("2026-08-01T00:00:00.000Z");
    const p = prizeProgress({
      signed: [signed("a@acme.com", new Date("2026-08-01T00:10:00Z"))],
      now: firstOfMonth,
      threshold: 5,
    });
    expect(p.count).toBe(1);
  });
});

describe("qualifiedAt — audit record of qualifying", () => {
  it("is null until the threshold is crossed", () => {
    const p = prizeProgress({ signed: [signed("a@acme.com")], now: NOW, threshold: 3 });
    expect(p.qualifiedAt).toBeNull();
  });

  it("records the moment of the Nth distinct signature, not the latest one", () => {
    // Evidences that the workspace qualified inside the month. Taking the most
    // recent signature instead would record when it last did anything, not
    // when it became eligible.
    const p = prizeProgress({
      signed: [
        signed("a@acme.com", new Date("2026-07-02T10:00:00Z")),
        signed("b@acme.com", new Date("2026-07-04T10:00:00Z")),
        signed("c@acme.com", new Date("2026-07-06T10:00:00Z")),
        signed("d@acme.com", new Date("2026-07-20T10:00:00Z")),
      ],
      now: NOW,
      threshold: 3,
    });
    expect(p.qualifiedAt?.toISOString()).toBe("2026-07-06T10:00:00.000Z");
  });

  it("is unaffected by the order the rows arrive in", () => {
    // Supabase returns rows in no guaranteed order; sorting inside the function
    // is what makes the answer stable.
    const rows = [
      signed("c@acme.com", new Date("2026-07-06T10:00:00Z")),
      signed("a@acme.com", new Date("2026-07-02T10:00:00Z")),
      signed("b@acme.com", new Date("2026-07-04T10:00:00Z")),
    ];
    const p = prizeProgress({ signed: rows, now: NOW, threshold: 3 });
    expect(p.qualifiedAt?.toISOString()).toBe("2026-07-06T10:00:00.000Z");
  });

  it("does not let a repeat signature from an existing recipient advance the crossing", () => {
    const p = prizeProgress({
      signed: [
        signed("a@acme.com", new Date("2026-07-02T10:00:00Z")),
        signed("a@acme.com", new Date("2026-07-03T10:00:00Z")),
        signed("b@acme.com", new Date("2026-07-09T10:00:00Z")),
      ],
      now: NOW,
      threshold: 2,
    });
    expect(p.qualifiedAt?.toISOString()).toBe("2026-07-09T10:00:00.000Z");
  });
});
