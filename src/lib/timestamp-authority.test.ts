import { describe, it, expect, vi, beforeEach } from "vitest";

const timestampPdf = vi.fn();
const extractTimestamps = vi.fn();
vi.mock("pdf-rfc3161", () => ({
  timestampPdf: (...args: unknown[]) => timestampPdf(...args),
  extractTimestamps: (...args: unknown[]) => extractTimestamps(...args),
  KNOWN_TSA_URLS: { SECTIGO: "https://timestamp.sectigo.com", FREETSA: "https://freetsa.org/tsr" },
}));

import { timestampWithFallback } from "./timestamp-authority";

const pdfIn = new Uint8Array([1, 2, 3]);
const pdfOut = new Uint8Array([4, 5, 6]);
const genTime = new Date("2026-08-03T12:00:00Z");
const token = new Uint8Array([9, 9, 9]);

// EuroTSA is a hardcoded literal in timestamp-authority.ts (self-hosted,
// not part of pdf-rfc3161's own KNOWN_TSA_URLS), so it's asserted against
// directly here rather than via the mocked KNOWN_TSA_URLS object above.
const EUROTSA_URL = "https://eurotsa.eu/tsr";

describe("timestampWithFallback", () => {
  beforeEach(() => {
    timestampPdf.mockReset();
    extractTimestamps.mockReset();
  });

  it("returns a sectigo result when the primary TSA succeeds", async () => {
    timestampPdf.mockResolvedValueOnce({ pdf: pdfOut, timestamp: { genTime } });
    extractTimestamps.mockResolvedValueOnce([{ info: { genTime }, token }]);

    const result = await timestampWithFallback(pdfIn);

    expect(result).toEqual({ pdf: pdfOut, tsa: "sectigo", genTime, token });
    expect(timestampPdf).toHaveBeenCalledTimes(1);
    expect(timestampPdf).toHaveBeenCalledWith(
      expect.objectContaining({ pdf: pdfIn, tsa: { url: "https://timestamp.sectigo.com" }, enableLTV: true })
    );
  });

  it("falls back to eurotsa (the new middle tier) when sectigo fails", async () => {
    timestampPdf.mockRejectedValueOnce(new Error("sectigo unreachable"));
    timestampPdf.mockResolvedValueOnce({ pdf: pdfOut, timestamp: { genTime } });
    extractTimestamps.mockResolvedValueOnce([{ info: { genTime }, token }]);

    const result = await timestampWithFallback(pdfIn);

    expect(result).toEqual({ pdf: pdfOut, tsa: "eurotsa", genTime, token });
    expect(timestampPdf).toHaveBeenCalledTimes(2);
    expect(timestampPdf).toHaveBeenNthCalledWith(2, expect.objectContaining({ tsa: { url: EUROTSA_URL } }));
  });

  it("falls all the way through to freetsa when both sectigo and eurotsa fail", async () => {
    timestampPdf.mockRejectedValueOnce(new Error("sectigo unreachable"));
    timestampPdf.mockRejectedValueOnce(new Error("eurotsa unreachable"));
    timestampPdf.mockResolvedValueOnce({ pdf: pdfOut, timestamp: { genTime } });
    extractTimestamps.mockResolvedValueOnce([{ info: { genTime }, token }]);

    const result = await timestampWithFallback(pdfIn);

    expect(result).toEqual({ pdf: pdfOut, tsa: "freetsa", genTime, token });
    expect(timestampPdf).toHaveBeenCalledTimes(3);
    expect(timestampPdf).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ tsa: { url: "https://freetsa.org/tsr" } })
    );
  });

  it("returns null (never throws) when all three TSAs fail", async () => {
    timestampPdf.mockRejectedValueOnce(new Error("sectigo unreachable"));
    timestampPdf.mockRejectedValueOnce(new Error("eurotsa unreachable"));
    timestampPdf.mockRejectedValueOnce(new Error("freetsa unreachable"));

    const result = await timestampWithFallback(pdfIn);

    expect(result).toBeNull();
    expect(timestampPdf).toHaveBeenCalledTimes(3);
  });

  it("returns null if every TSA reports success but no token can be extracted back out", async () => {
    timestampPdf.mockResolvedValueOnce({ pdf: pdfOut, timestamp: { genTime } });
    extractTimestamps.mockResolvedValueOnce([]); // sectigo: nothing extractable
    timestampPdf.mockRejectedValueOnce(new Error("eurotsa unreachable"));
    timestampPdf.mockRejectedValueOnce(new Error("freetsa unreachable"));

    const result = await timestampWithFallback(pdfIn);

    expect(result).toBeNull();
    expect(timestampPdf).toHaveBeenCalledTimes(3);
  });

  it("picks the LAST extracted timestamp, in case more than one is present", async () => {
    const olderToken = new Uint8Array([1]);
    const newerToken = new Uint8Array([2]);
    timestampPdf.mockResolvedValueOnce({ pdf: pdfOut, timestamp: { genTime } });
    extractTimestamps.mockResolvedValueOnce([
      { info: { genTime: new Date("2020-01-01") }, token: olderToken },
      { info: { genTime }, token: newerToken },
    ]);

    const result = await timestampWithFallback(pdfIn);

    expect(result?.token).toBe(newerToken);
  });
});
