import { describe, it, expect } from "vitest";
import { parseCsvRows, normalizeDate, parseTransactionsCsv } from "@/lib/importCsv";
import { generateCsvContent } from "@/lib/exportCsv";

describe("parseCsvRows", () => {
  it("strips BOM and handles CRLF", () => {
    const rows = parseCsvRows("﻿a,b\r\nc,d\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCsvRows('name,note\n"Doe, John","say ""hi"""');
    expect(rows).toEqual([
      ["name", "note"],
      ["Doe, John", 'say "hi"'],
    ]);
  });

  it("drops fully blank rows", () => {
    const rows = parseCsvRows("a,b\n\n,\nc,d");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("normalizeDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(normalizeDate("2024-03-05")).toBe("2024-03-05");
  });
  it("accepts day-first DD/MM/YYYY", () => {
    expect(normalizeDate("05/03/2024")).toBe("2024-03-05");
  });
  it("converts Thai Buddhist year", () => {
    expect(normalizeDate("2567-03-05")).toBe("2024-03-05");
  });
  it("rejects impossible dates", () => {
    expect(normalizeDate("2024-13-40")).toBeNull();
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("2024-02-30")).toBeNull();
  });
});

describe("parseTransactionsCsv", () => {
  it("reports a header error when required columns are missing", () => {
    const result = parseTransactionsCsv("foo,bar\n1,2");
    expect(result.headerError).toBeTruthy();
    expect(result.valid).toHaveLength(0);
  });

  it("parses Thai-headered rows produced by the exporter (round-trip)", () => {
    const csv = generateCsvContent(
      [
        { date: "2024-03-05", time: "14:30", type: "expense", amount: 1250.5, category: "อาหาร", description: "ข้าวมันไก่" },
        { date: "2024-03-06", time: "", type: "income", amount: 50000, category: "เงินเดือน", description: "" },
      ],
    );
    const result = parseTransactionsCsv(csv);
    expect(result.headerError).toBeUndefined();
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(2);

    expect(result.valid[0]).toMatchObject({
      date: "2024-03-05",
      time: "14:30",
      type: "expense",
      amount: 1250.5,
      categoryName: "อาหาร",
      description: "ข้าวมันไก่",
    });
    expect(result.valid[1]).toMatchObject({ type: "income", amount: 50000, categoryName: "เงินเดือน" });
    expect(result.valid[1].description).toBeUndefined();
  });

  it("accepts English headers and currency-formatted amounts", () => {
    const csv = ["date,type,amount,category", "2024-01-10,expense,\"฿1,234.00\",Food"].join("\n");
    const result = parseTransactionsCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({ type: "expense", amount: 1234, categoryName: "Food" });
  });

  it("collects per-row errors without dropping valid rows", () => {
    const csv = [
      "วันที่,ประเภท,จำนวนเงิน,หมวดหมู่",
      "2024-03-05,รายจ่าย,100,อาหาร", // ok
      "bad-date,รายจ่าย,100,อาหาร", // bad date
      "2024-03-06,unknown,100,อาหาร", // bad type
      "2024-03-07,รายรับ,abc,เงินเดือน", // bad amount (not a number)
      "2024-03-08,รายรับ,5000,เงินเดือน", // ok
    ].join("\n");
    const result = parseTransactionsCsv(csv);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((e) => e.line)).toEqual([3, 4, 5]);
  });

  it("treats absolute value of amounts (negative expense allowed)", () => {
    const csv = ["date,type,amount", "2024-01-10,expense,\"-250\""].join("\n");
    const result = parseTransactionsCsv(csv);
    expect(result.valid[0].amount).toBe(250);
  });
});
