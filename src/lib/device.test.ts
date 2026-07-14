import { describe, expect, it } from "vitest";
import { classifyDevice } from "./device";

describe("classifyDevice", () => {
  it("classifies an iPhone user agent as mobile", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("mobile");
  });

  it("classifies an Android phone user agent as mobile", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
      )
    ).toBe("mobile");
  });

  it("classifies an iPad user agent as tablet", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("tablet");
  });

  it("classifies a desktop Chrome user agent as desktop", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      )
    ).toBe("desktop");
  });

  it("defaults to desktop when there's no user agent", () => {
    expect(classifyDevice(null)).toBe("desktop");
  });
});
