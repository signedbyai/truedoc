import { describe, expect, it } from "vitest";
import { greetingForHour } from "./time-greeting";

describe("greetingForHour", () => {
  it("covers all 24 hours with the right buckets", () => {
    expect(greetingForHour(5)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(17)).toBe("Good afternoon");
    expect(greetingForHour(18)).toBe("Good evening");
    expect(greetingForHour(21)).toBe("Good evening");
    expect(greetingForHour(22)).toBe("Working late");
    expect(greetingForHour(0)).toBe("Working late");
    expect(greetingForHour(4)).toBe("Working late");
  });
});
