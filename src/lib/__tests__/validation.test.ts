import { describe, it, expect } from "vitest";
import { isValidAmount, sanitizeText, clampAmountInput, isValidDescription } from "../validation";

describe("isValidAmount", () => {
  it("rejects empty string", () => {
    expect(isValidAmount("")).toBe(false);
  });

  it("rejects negative numbers", () => {
    expect(isValidAmount("-50000")).toBe(false);
    expect(isValidAmount("-1")).toBe(false);
    expect(isValidAmount("-0.01")).toBe(false);
  });

  it("rejects zero", () => {
    expect(isValidAmount("0")).toBe(false);
    expect(isValidAmount("0.00")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isValidAmount("abc")).toBe(false);
    expect(isValidAmount("NaN")).toBe(false);
  });

  it("rejects amounts exceeding max limit", () => {
    expect(isValidAmount("1000000000")).toBe(false);
    expect(isValidAmount("999999999.01")).toBe(false);
  });

  it("accepts valid positive amounts", () => {
    expect(isValidAmount("1")).toBe(true);
    expect(isValidAmount("0.01")).toBe(true);
    expect(isValidAmount("50000")).toBe(true);
    expect(isValidAmount("999999999")).toBe(true);
  });

  it("accepts decimal amounts", () => {
    expect(isValidAmount("100.50")).toBe(true);
    expect(isValidAmount("0.99")).toBe(true);
  });

  it("handles scientific notation", () => {
    expect(isValidAmount("1e10")).toBe(false);
    expect(isValidAmount("1e2")).toBe(true);
  });
});

describe("sanitizeText (XSS Prevention)", () => {
  it("strips HTML script tags", () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("strips HTML tags but keeps text", () => {
    expect(sanitizeText("<b>bold</b> text")).toBe("bold text");
  });

  it("handles normal Thai text unchanged", () => {
    expect(sanitizeText("ค่าอาหาร")).toBe("ค่าอาหาร");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  test  ")).toBe("test");
  });

  it("strips nested tags", () => {
    expect(sanitizeText('<div><img src=x onerror=alert(1)></div>')).toBe("");
  });

  it("handles event handler attributes", () => {
    expect(sanitizeText('<a onclick="evil()">click</a>')).toBe("click");
  });
});

describe("clampAmountInput", () => {
  it("allows empty string (clearing input)", () => {
    expect(clampAmountInput("")).toBe("");
  });

  it("rejects negative numbers", () => {
    expect(clampAmountInput("-5")).toBe(null);
  });

  it("rejects over-limit numbers", () => {
    expect(clampAmountInput("1000000000")).toBe(null);
  });

  it("passes valid numbers through", () => {
    expect(clampAmountInput("500")).toBe("500");
    expect(clampAmountInput("0.01")).toBe("0.01");
  });
});

describe("isValidDescription", () => {
  it("accepts normal text", () => {
    expect(isValidDescription("ค่าอาหาร")).toBe(true);
  });

  it("rejects text exceeding max length", () => {
    const longText = "a".repeat(501);
    expect(isValidDescription(longText)).toBe(false);
  });

  it("accepts text at max length", () => {
    const text = "a".repeat(500);
    expect(isValidDescription(text)).toBe(true);
  });

  it("strips HTML before checking length", () => {
    const htmlText = "<b>" + "a".repeat(499) + "</b>";
    expect(isValidDescription(htmlText)).toBe(true);
  });
});

describe("Edge Cases", () => {
  it("handles very small decimal amounts", () => {
    expect(isValidAmount("0.001")).toBe(true);
  });

  it("handles Infinity", () => {
    expect(isValidAmount("Infinity")).toBe(false);
  });

  it("handles whitespace-only descriptions", () => {
    expect(sanitizeText("   ")).toBe("");
  });
});
