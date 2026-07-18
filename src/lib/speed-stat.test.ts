import { describe, expect, it } from "vitest";
import {
  buildSpeedStat,
  formatSpeedSeconds,
  speedStatCardLine,
  speedStatShareText,
  MAX_PLAUSIBLE_SECONDS,
  MIN_SAMPLE_SIZE_FOR_PERCENTILE,
  MIN_PERCENTILE_TO_SHOW,
  MAX_PERCENTILE_TO_SHOW,
} from "./speed-stat";

describe("buildSpeedStat", () => {
  it("returns the stat with percentile when the sample is large enough", () => {
    const stat = buildSpeedStat({ activeSeconds: 38.4, percentile: 84, sampleSize: 40 });
    expect(stat).toEqual({ seconds: 38, percentile: 84 });
  });

  it("drops the percentile (keeps the time) when the sample is too small", () => {
    const stat = buildSpeedStat({
      activeSeconds: 38,
      percentile: 100,
      sampleSize: MIN_SAMPLE_SIZE_FOR_PERCENTILE - 1,
    });
    expect(stat).toEqual({ seconds: 38, percentile: null });
  });

  it("keeps the percentile right at the sample-size threshold", () => {
    const stat = buildSpeedStat({ activeSeconds: 38, percentile: 60, sampleSize: MIN_SAMPLE_SIZE_FOR_PERCENTILE });
    expect(stat?.percentile).toBe(60);
  });

  // "faster than 13% of signers" means slower than 87% of them -- an insult
  // dressed as a brag. Below the bar we keep the time and drop the comparison.
  it("drops an unflattering percentile even with a large sample", () => {
    const stat = buildSpeedStat({ activeSeconds: 124, percentile: 13, sampleSize: 40 });
    expect(stat).toEqual({ seconds: 124, percentile: null });
  });

  it("keeps the percentile right at the flattering threshold", () => {
    const stat = buildSpeedStat({ activeSeconds: 38, percentile: MIN_PERCENTILE_TO_SHOW, sampleSize: 40 });
    expect(stat?.percentile).toBe(MIN_PERCENTILE_TO_SHOW);
  });

  it("drops a percentile just below the flattering threshold", () => {
    const stat = buildSpeedStat({ activeSeconds: 38, percentile: MIN_PERCENTILE_TO_SHOW - 1, sampleSize: 40 });
    expect(stat?.percentile).toBeNull();
  });

  // "faster than 100% of signers" reads as broken -- you can't beat yourself.
  it("caps a 100th-percentile result so it never claims 100%", () => {
    const stat = buildSpeedStat({ activeSeconds: 19, percentile: 100, sampleSize: 40 });
    expect(stat).toEqual({ seconds: 19, percentile: MAX_PERCENTILE_TO_SHOW });
    expect(speedStatCardLine(stat!)).toBe("In 19 seconds — faster than 99% of signers this month.");
  });

  it("returns null for implausibly long timings (e.g. free-plan wall-clock fallback after a long idle gap)", () => {
    const stat = buildSpeedStat({ activeSeconds: MAX_PLAUSIBLE_SECONDS + 1, percentile: 90, sampleSize: 40 });
    expect(stat).toBeNull();
  });

  it("returns null for zero/negative/missing timing", () => {
    expect(buildSpeedStat({ activeSeconds: 0, percentile: null, sampleSize: 0 })).toBeNull();
    expect(buildSpeedStat({ activeSeconds: -5, percentile: null, sampleSize: 0 })).toBeNull();
    expect(buildSpeedStat({ activeSeconds: null, percentile: null, sampleSize: 0 })).toBeNull();
  });

  it("rounds fractional seconds", () => {
    expect(buildSpeedStat({ activeSeconds: 12.6, percentile: null, sampleSize: 0 })?.seconds).toBe(13);
  });
});

describe("formatSpeedSeconds", () => {
  it("formats sub-minute durations", () => {
    expect(formatSpeedSeconds(1)).toBe("1 second");
    expect(formatSpeedSeconds(38)).toBe("38 seconds");
  });

  it("formats exact minutes", () => {
    expect(formatSpeedSeconds(60)).toBe("1 minute");
    expect(formatSpeedSeconds(120)).toBe("2 minutes");
  });

  it("formats minutes plus seconds", () => {
    expect(formatSpeedSeconds(72)).toBe("1 minute 12 seconds");
    expect(formatSpeedSeconds(125)).toBe("2 minutes 5 seconds");
  });
});

describe("speedStatCardLine", () => {
  it("includes the percentile clause when present", () => {
    expect(speedStatCardLine({ seconds: 26, percentile: 77 })).toBe(
      "In 26 seconds — faster than 77% of signers this month."
    );
  });

  it("omits the percentile clause when absent", () => {
    expect(speedStatCardLine({ seconds: 26, percentile: null })).toBe("In 26 seconds.");
  });
});

describe("speedStatShareText", () => {
  it("prefixes the card line with 'Document signed.' -- matches what the card image itself shows", () => {
    expect(speedStatShareText({ seconds: 26, percentile: 77 })).toBe(
      "Document signed. In 26 seconds — faster than 77% of signers this month."
    );
  });

  it("omits the percentile clause when absent", () => {
    expect(speedStatShareText({ seconds: 26, percentile: null })).toBe("Document signed. In 26 seconds.");
  });
});
