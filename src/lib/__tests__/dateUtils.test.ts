import { describe, it, expect } from "vitest";
import { parseLocalDate, getLocalDateString, getLocalTimeString } from "@/lib/dateUtils";

describe("dateUtils", () => {
  describe("parseLocalDate", () => {
    it("returns a Date object for valid date string", () => {
      const result = parseLocalDate("2024-01-15");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("handles end of month correctly", () => {
      const result = parseLocalDate("2024-01-31");
      expect(result.getDate()).toBe(31);
    });

    it("handles leap year Feb 29", () => {
      const result = parseLocalDate("2024-02-29");
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(29);
    });

    it("handles year boundaries", () => {
      const dec31 = parseLocalDate("2024-12-31");
      expect(dec31.getFullYear()).toBe(2024);
      expect(dec31.getMonth()).toBe(11);
      expect(dec31.getDate()).toBe(31);

      const jan1 = parseLocalDate("2025-01-01");
      expect(jan1.getFullYear()).toBe(2025);
      expect(jan1.getMonth()).toBe(0);
      expect(jan1.getDate()).toBe(1);
    });
  });

  describe("getLocalDateString", () => {
    it("returns yyyy-MM-dd format", () => {
      const date = new Date(2024, 5, 15);
      const result = getLocalDateString(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toBe("2024-06-15");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2024, 0, 5);
      const result = getLocalDateString(date);
      expect(result).toBe("2024-01-05");
    });

    it("defaults to current date when no argument", () => {
      const result = getLocalDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getLocalTimeString", () => {
    it("returns HH:mm format", () => {
      const result = getLocalTimeString();
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it("pads single-digit hours and minutes", () => {
      const date = new Date(2024, 0, 1, 5, 3);
      const result = getLocalTimeString(date);
      expect(result).toBe("05:03");
    });

    it("handles midnight", () => {
      const date = new Date(2024, 0, 1, 0, 0);
      const result = getLocalTimeString(date);
      expect(result).toBe("00:00");
    });

    it("handles end of day", () => {
      const date = new Date(2024, 0, 1, 23, 59);
      const result = getLocalTimeString(date);
      expect(result).toBe("23:59");
    });
  });

  describe("roundtrip consistency", () => {
    it("parseLocalDate and getLocalDateString are inverses", () => {
      const original = "2024-06-15";
      const date = parseLocalDate(original);
      const result = getLocalDateString(date);
      expect(result).toBe(original);
    });

    it("works for various dates", () => {
      const dates = ["2024-01-01", "2024-02-29", "2024-12-31", "2025-06-15"];
      for (const d of dates) {
        expect(getLocalDateString(parseLocalDate(d))).toBe(d);
      }
    });
  });
});
