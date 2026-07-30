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
    // $25 cap, $0.25/doc -> 100 billable units total, 80 to hit the 80% warning.
    const justUnder = computeConsoleBillingState({ unitsUsed: CONSOLE_FREE_ALLOWANCE + 79, capEnabled: true, capCents: 2500 });
    expect(justUnder.warningThresholdReached).toBe(false);

    const atThreshold = computeConsoleBillingState({ unitsUsed: CONSOLE_FREE_ALLOWANCE + 80, capEnabled: true, capCents: 2500 });
    expect(atThreshold.warningThresholdReached).toBe(true);
    expect(atThreshold.capReached).toBe(false);
  });

  it("reaches the cap exactly at 100 billable units on a $25 cap", () => {
    const state = computeConsoleBillingState({ unitsUsed: CONSOLE_FREE_ALLOWANCE + 100, capEnabled: true, capCents: 2500 });
    expect(state.capReached).toBe(true);
  });

  it("never reports capReached or warningThresholdReached when the cap is disabled", () => {
    const state = computeConsoleBillingState({ unitsUsed: CONSOLE_FREE_ALLOWANCE + 1000, capEnabled: false, capCents: 2500 });
    expect(state.capReached).toBe(false);
    expect(state.warningThresholdReached).toBe(false);
  });
});
