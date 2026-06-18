import { describe, it, expect } from "vitest";
import { isOpenNow } from "@/lib/openingHours";

// A fixed reference moment: Wednesday 2025-01-15, 10:00 local time.
const wed10 = new Date(2025, 0, 15, 10, 0);
const wed23 = new Date(2025, 0, 15, 23, 0);
const sun10 = new Date(2025, 0, 19, 10, 0);

describe("isOpenNow", () => {
  it("returns unknown for empty/missing spec", () => {
    expect(isOpenNow(undefined, wed10)).toBe("unknown");
    expect(isOpenNow("", wed10)).toBe("unknown");
  });

  it("treats 24/7 as always open", () => {
    expect(isOpenNow("24/7", wed23)).toBe("open");
  });

  it("handles a simple all-week range", () => {
    expect(isOpenNow("Mo-Su 08:00-22:00", wed10)).toBe("open");
    expect(isOpenNow("Mo-Su 08:00-22:00", wed23)).toBe("closed");
  });

  it("respects day-of-week restrictions", () => {
    // Open Mon-Fri only; Sunday should be closed.
    expect(isOpenNow("Mo-Fr 08:00-18:00", wed10)).toBe("open");
    expect(isOpenNow("Mo-Fr 08:00-18:00", sun10)).toBe("closed");
  });

  it("handles multiple rules separated by semicolons", () => {
    const spec = "Mo-Fr 08:00-12:00,13:00-17:00; Sa 09:00-12:00";
    expect(isOpenNow(spec, wed10)).toBe("open");
    // Wed 12:30 is in the lunch gap -> closed.
    expect(isOpenNow(spec, new Date(2025, 0, 15, 12, 30))).toBe("closed");
  });

  it("handles ranges crossing midnight", () => {
    // Open until 02:00; at 23:00 it should still be open.
    expect(isOpenNow("Mo-Su 18:00-02:00", wed23)).toBe("open");
    // At 01:00 Thursday, the Wednesday range still covers it.
    expect(isOpenNow("Mo-Su 18:00-02:00", new Date(2025, 0, 16, 1, 0))).toBe("open");
  });

  it("returns unknown for patterns it cannot model", () => {
    expect(isOpenNow("Mo-Fr 08:00-18:00; PH off", wed10)).toBe("unknown");
    expect(isOpenNow("Jan-Mar 08:00-18:00", wed10)).toBe("unknown");
  });
});
