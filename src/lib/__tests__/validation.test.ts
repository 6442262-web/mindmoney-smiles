import { describe, it, expect } from "vitest";
import { isValidAmount, sanitizeText, clampAmountInput, isValidDescription, getAmountError, validateTextField, formatAmount } from "../validation";

describe("isValidAmount", () => {
  it("rejects empty string", () => {
    expect(isValidAmount("")).toBe(false);
  });

  it("rejects whitespace-only", () => {
    expect(isValidAmount("   ")).toBe(false);
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
    expect(isValidAmount("undefined")).toBe(false);
    expect(isValidAmount("null")).toBe(false);
    expect(isValidAmount("12abc")).toBe(false);
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
    expect(isValidAmount("1e10")).toBe(false); // over max
    expect(isValidAmount("1e2")).toBe(true);  // = 100
  });

  it("handles Infinity", () => {
    expect(isValidAmount("Infinity")).toBe(false);
    expect(isValidAmount("-Infinity")).toBe(false);
  });

  it("handles very small decimal amounts", () => {
    expect(isValidAmount("0.001")).toBe(true);
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

  it("handles svg-based XSS", () => {
    expect(sanitizeText('<svg onload="alert(1)"><desc>test</desc></svg>')).toBe("test");
  });

  it("handles iframe injection", () => {
    expect(sanitizeText('<iframe src="evil.com"></iframe>')).toBe("");
  });

  it("preserves emoji", () => {
    expect(sanitizeText("☕ กาแฟ 🍕 พิซซ่า")).toBe("☕ กาแฟ 🍕 พิซซ่า");
  });
});

describe("clampAmountInput", () => {
  it("allows empty string (clearing input)", () => {
    expect(clampAmountInput("")).toBe("");
  });

  it("rejects negative numbers", () => {
    expect(clampAmountInput("-5")).toBe(null);
    expect(clampAmountInput("-0.01")).toBe(null);
  });

  it("rejects over-limit numbers", () => {
    expect(clampAmountInput("1000000000")).toBe(null);
  });

  it("passes valid numbers through", () => {
    expect(clampAmountInput("500")).toBe("500");
    expect(clampAmountInput("0.01")).toBe("0.01");
    expect(clampAmountInput("0")).toBe("0");
  });

  it("rejects NaN strings", () => {
    expect(clampAmountInput("abc")).toBe(null);
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

  it("accepts custom max length", () => {
    expect(isValidDescription("hello", 3)).toBe(false);
    expect(isValidDescription("hi", 3)).toBe(true);
  });
});

describe("getAmountError", () => {
  it("returns error for empty input", () => {
    expect(getAmountError("")).not.toBeNull();
    expect(getAmountError("  ")).not.toBeNull();
  });

  it("returns error for non-numeric", () => {
    expect(getAmountError("abc")).toContain("ตัวเลข");
  });

  it("returns error for zero", () => {
    expect(getAmountError("0")).toContain("มากกว่า 0");
  });

  it("returns error for negative", () => {
    expect(getAmountError("-100")).toContain("มากกว่า 0");
  });

  it("returns error for over max", () => {
    expect(getAmountError("1000000000")).toContain("999,999,999");
  });

  it("returns null for valid amount", () => {
    expect(getAmountError("500")).toBeNull();
    expect(getAmountError("999999999")).toBeNull();
  });

  it("uses custom field name", () => {
    expect(getAmountError("", "ราคา")).toContain("ราคา");
  });
});

describe("validateTextField", () => {
  it("sanitizes and returns text", () => {
    expect(validateTextField("<b>test</b>")).toBe("test");
  });

  it("returns null for too-long text", () => {
    expect(validateTextField("a".repeat(501))).toBeNull();
  });

  it("respects custom max length", () => {
    expect(validateTextField("hello", 3)).toBeNull();
    expect(validateTextField("hi", 3)).toBe("hi");
  });
});

describe("formatAmount", () => {
  it("formats with default currency", () => {
    const result = formatAmount(50000);
    expect(result).toContain("฿");
    expect(result).toContain("50,000");
  });

  it("formats with custom currency", () => {
    const result = formatAmount(1000, "$");
    expect(result).toStartWith("$");
  });

  it("handles decimal amounts", () => {
    const result = formatAmount(100.5);
    expect(result).toContain("100.5");
  });

  it("handles zero", () => {
    const result = formatAmount(0);
    expect(result).toBe("฿0");
  });
});

describe("Edge Cases - Financial Safety", () => {
  it("handles whitespace-only descriptions", () => {
    expect(sanitizeText("   ")).toBe("");
  });

  it("prevents negative amount bypass via string manipulation", () => {
    expect(isValidAmount("--5")).toBe(false);
    expect(isValidAmount("5-")).toBe(false);
  });

  it("handles amounts with leading zeros", () => {
    expect(isValidAmount("007")).toBe(true); // parseFloat("007") = 7
    expect(clampAmountInput("007")).toBe("007");
  });

  it("handles amounts with trailing dots", () => {
    expect(isValidAmount("100.")).toBe(true); // parseFloat("100.") = 100
  });
});
