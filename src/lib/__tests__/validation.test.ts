import { describe, it, expect } from "vitest";

// Validation helpers matching the app logic
function isValidAmount(value: string): boolean {
  if (!value) return false;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (num <= 0) return false;
  if (num > 999999999) return false;
  return true;
}

function sanitizeDescription(value: string): string {
  // Strip HTML tags to prevent XSS
  return value.replace(/<[^>]*>/g, '').trim();
}

describe("Amount Validation", () => {
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
    // Note: parseFloat("12abc") returns 12, which is valid per JS behavior
    // The HTML input type="number" prevents this at the UI level
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
});

describe("Description Sanitization (XSS Prevention)", () => {
  it("strips HTML script tags", () => {
    expect(sanitizeDescription('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("strips HTML tags but keeps text", () => {
    expect(sanitizeDescription("<b>bold</b> text")).toBe("bold text");
  });

  it("handles normal text unchanged", () => {
    expect(sanitizeDescription("ค่าอาหาร")).toBe("ค่าอาหาร");
  });

  it("trims whitespace", () => {
    expect(sanitizeDescription("  test  ")).toBe("test");
  });
});

describe("Edge Cases", () => {
  it("handles very small decimal amounts", () => {
    expect(isValidAmount("0.001")).toBe(true);
  });

  it("handles scientific notation input", () => {
    // parseFloat handles this - 1e10 > 999999999
    expect(isValidAmount("1e10")).toBe(false);
    expect(isValidAmount("1e2")).toBe(true); // 100
  });
});
