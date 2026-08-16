import { describe, it, expect } from "vitest";
import {
  validateFieldValue,
  MAX_TEXT_LENGTH,
  MAX_SIGNATURE_BYTES,
} from "./field-value-validation";

// A minimal but genuinely valid base64 PNG data URL.
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("validateFieldValue", () => {
  describe("empty values", () => {
    // Emptiness is the required-field check's job, not this function's.
    it.each(["signature", "initials", "date", "text", "checkbox"] as const)(
      "accepts an empty %s value",
      (type) => {
        expect(validateFieldValue(type, "")).toBeNull();
        expect(validateFieldValue(type, "   ")).toBeNull();
      }
    );
  });

  describe("signature / initials", () => {
    it("accepts a real PNG data URL", () => {
      expect(validateFieldValue("signature", PNG_1PX)).toBeNull();
      expect(validateFieldValue("initials", PNG_1PX)).toBeNull();
    });

    it("accepts a JPEG data URL", () => {
      expect(validateFieldValue("signature", "data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBeNull();
    });

    // The reported bug: arbitrary text reached the DB and then stamped BLANK
    // into a sealed, hashed, certified PDF.
    it.each(["asdf", "x", "12/05/2026", "Michael Eagles", "<script>alert(1)</script>"])(
      "rejects arbitrary text %s",
      (value) => {
        expect(validateFieldValue("signature", value)).toBe("must be a PNG or JPEG image");
      }
    );

    it("rejects a non-image data URL", () => {
      expect(validateFieldValue("signature", "data:text/html;base64,PGgxPmhpPC9oMT4=")).toBe(
        "must be a PNG or JPEG image"
      );
    });

    it("rejects an SVG data URL (script-bearing image type)", () => {
      expect(validateFieldValue("signature", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(
        "must be a PNG or JPEG image"
      );
    });

    it("rejects truncated base64", () => {
      // 5 chars — not a multiple of 4, so it can't decode cleanly.
      expect(validateFieldValue("signature", "data:image/png;base64,QUJDRE")).toBe(
        "image data could not be decoded"
      );
    });

    it("rejects an image over the size cap", () => {
      // 4 base64 chars -> 3 bytes, so this comfortably exceeds the cap.
      const oversized = "A".repeat(Math.ceil((MAX_SIGNATURE_BYTES / 3) * 4) + 4);
      expect(validateFieldValue("signature", `data:image/png;base64,${oversized}`)).toBe(
        "image is too large"
      );
    });

    it("accepts an image just under the size cap", () => {
      const b64Len = Math.floor(MAX_SIGNATURE_BYTES / 3) * 4;
      expect(validateFieldValue("signature", `data:image/png;base64,${"A".repeat(b64Len)}`)).toBeNull();
    });
  });

  describe("date", () => {
    it("accepts an ISO date", () => {
      expect(validateFieldValue("date", "2026-08-16")).toBeNull();
    });

    it("accepts a leap day in a leap year", () => {
      expect(validateFieldValue("date", "2024-02-29")).toBeNull();
    });

    // The tester's original (mis-attributed) complaint: arbitrary digits.
    it.each(["16/08/2026", "asdf", "20260816", "2026-8-16", "99999999"])(
      "rejects %s",
      (value) => {
        expect(validateFieldValue("date", value)).toBe("must be a date in YYYY-MM-DD format");
      }
    );

    // Matches the regex but isn't a real date — new Date() would silently roll
    // these forward rather than reject them.
    it.each(["2026-02-31", "2026-13-01", "2026-00-10", "2025-02-29"])(
      "rejects the impossible date %s",
      (value) => {
        expect(validateFieldValue("date", value)).toBe("is not a real calendar date");
      }
    );
  });

  describe("checkbox", () => {
    it('accepts exactly "true"', () => {
      expect(validateFieldValue("checkbox", "true")).toBeNull();
    });

    it.each(["false", "1", "yes", "TRUE", "on"])("rejects %s", (value) => {
      expect(validateFieldValue("checkbox", value)).toBe('must be "true" or empty');
    });
  });

  describe("text", () => {
    it("accepts ordinary text", () => {
      expect(validateFieldValue("text", "Acme Trading B.V.")).toBeNull();
    });

    it("accepts text at exactly the cap", () => {
      expect(validateFieldValue("text", "a".repeat(MAX_TEXT_LENGTH))).toBeNull();
    });

    it("rejects text over the cap", () => {
      expect(validateFieldValue("text", "a".repeat(MAX_TEXT_LENGTH + 1))).toBe(
        `must be ${MAX_TEXT_LENGTH} characters or fewer`
      );
    });
  });

  // Cross-type: the whole point is that the type now means something.
  describe("types are actually distinguished", () => {
    it("rejects a date value in a signature field", () => {
      expect(validateFieldValue("signature", "2026-08-16")).not.toBeNull();
    });

    it("rejects a signature image in a date field", () => {
      expect(validateFieldValue("date", PNG_1PX)).not.toBeNull();
    });

    it("accepts the same image for both signature and initials", () => {
      expect(validateFieldValue("signature", PNG_1PX)).toBeNull();
      expect(validateFieldValue("initials", PNG_1PX)).toBeNull();
    });
  });
});
