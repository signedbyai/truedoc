import { describe, it, expect } from "vitest";
import { computeConsoleBillingState, CONSOLE_FREE_ALLOWANCE, CONSOLE_OVERAGE_CENTS } from "@/lib/console-usage";

describe("computeConsoleBillingState", () => {
  it("stays free within the allowance", () => {
    const state = computeConsoleBillingState({ unitsUsed: 12, capEnabled: true, capCents: 2500 });
    expect(state.billableUnits).toBe(0);
    expect(state.billCents).toBe(0);
    expect(state.capReached).toBe(false);
    expect(state.warningThresholdReached).toBe(false);
  });

  it("bills only units past the free allowance", () => {
    const state = computeConsoleBillingState({ unitsUsed: CONSOLE_FREE_ALLOWANCE + 14, capEnabled: true, capCents: 2500 });
    expect(state.billableUnits).toBe(14);
    expect(state.billCents).toBe(14 * CONSOLE_OVERAGE_CENTS);
  });

  it("reaches the warning threshold at 80% of the cap", () => {
    // $25 cap -> capUnits billable units total (at the current per-doc
    // rate), 80% of that to hit the warning. Derived from
    // CONSOLE_OVERAGE_CENTS rather than a hardcoded unit count so this
    // doesn't silently drift out of sync (and start passing for the wrong
    // reason) the next time the per-doc rate changes — it already has once,
    // $0.25 -> $0.20 on 2026-08-03.
    const capUnits = 2500 / CONSOLE_OVERAGE_CENTS;
    const warningUnits = Math.ceil(capUnits * 0.8);

    const justUnder = computeConsoleBillingState({
      unitsUsed: CONSOLE_FREE_ALLOWANCE + warningUnits - 1,
      capEnabled: true,
      capCents: 2500,
    });
    expect(justUnder.warningThresholdReached).toBe(false);

    const atThreshold = computeConsoleBillingState({
      unitsUsed: CONSOLE_FREE_ALLOWANCE + warningUnits,
      capEnabled: true,
      capCents: 2500,
    });
    expect(atThreshold.warningThresholdReached).toBe(true);
    expect(atThreshold.capReached).toBe(false);
  });

  it("reaches the cap exactly at capUnits billable units on a $25 cap", () => {
    const capUnits = 2500 / CONSOLE_OVERAGE_CENTS;
    const state = computeConsoleBillingState({ unitsUsed: CONSOLE_FREE_ALLOWANCE + capUnits, capEnabled: true, capCents: 2500 });
    expect(state.capReached).toBe(true);
  });

  it("never reports capReached or warningThresholdReached when the cap is disabled", () => {
    const state = computeConsoleBillingState({ unitsUsed: CONSOLE_FREE_ALLOWANCE + 1000, capEnabled: false, capCents: 2500 });
    expect(state.capReached).toBe(false);
    expect(state.warningThresholdReached).toBe(false);
  });
});
