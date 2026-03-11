import { describe, it, expect } from "vitest";
import { parseLocalDate, getLocalDateString, getLocalTimeString } from "@/lib/dateUtils";

describe("dateUtils", () => {
  it("parseLocalDate returns a Date object for valid date string", () => {
    const result = parseLocalDate("2024-01-15");
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(15);
  });

  it("getLocalDateString returns yyyy-MM-dd format", () => {
    const date = new Date(2024, 5, 15); // June 15, 2024
    const result = getLocalDateString(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getLocalTimeString returns HH:mm format", () => {
    const result = getLocalTimeString();
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});
