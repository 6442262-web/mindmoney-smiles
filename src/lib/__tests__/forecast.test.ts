import { describe, it, expect } from "vitest";
import {
  computeExpenseForecast,
  recurringMonthlyAmount,
  type ForecastTxn,
  type ForecastRecurring,
} from "@/lib/forecast";

// Fixed reference date so month bucketing is deterministic.
// June 2024 -> completed months considered: Dec'23..May'24.
const NOW = new Date(2024, 5, 15); // 2024-06-15

function expense(date: string, amount: number, category_id?: string): ForecastTxn {
  return { type: "expense", amount, date, category_id };
}

describe("recurringMonthlyAmount", () => {
  it("normalises each frequency to a monthly figure", () => {
    expect(recurringMonthlyAmount({ type: "expense", amount: 1200, frequency: "monthly" })).toBe(1200);
    expect(recurringMonthlyAmount({ type: "expense", amount: 12000, frequency: "yearly" })).toBe(1000);
    expect(recurringMonthlyAmount({ type: "expense", amount: 100, frequency: "daily" })).toBeCloseTo(3040, 0);
    expect(recurringMonthlyAmount({ type: "expense", amount: 100, frequency: "weekly" })).toBeCloseTo(434.5, 1);
  });
});

describe("computeExpenseForecast", () => {
  it("projects a flat forecast from flat history", () => {
    const txns: ForecastTxn[] = [
      expense("2023-12-10", 10000),
      expense("2024-01-10", 10000),
      expense("2024-02-10", 10000),
      expense("2024-03-10", 10000),
      expense("2024-04-10", 10000),
      expense("2024-05-10", 10000),
    ];
    const result = computeExpenseForecast(txns, [], { now: NOW, horizon: 3 });

    expect(result.monthsOfData).toBe(6);
    expect(result.avgMonthly).toBeCloseTo(10000, 5);
    expect(result.trendSlope).toBeCloseTo(0, 5);
    expect(result.forecastTotals).toHaveLength(3);
    result.forecastTotals.forEach((v) => expect(v).toBeCloseTo(10000, 0));
    expect(result.confidence).toBe("high");
  });

  it("captures a rising trend and projects it upward", () => {
    const txns: ForecastTxn[] = [
      expense("2023-12-10", 1000),
      expense("2024-01-10", 2000),
      expense("2024-02-10", 3000),
      expense("2024-03-10", 4000),
      expense("2024-04-10", 5000),
      expense("2024-05-10", 6000),
    ];
    const result = computeExpenseForecast(txns, [], { now: NOW, horizon: 3 });

    expect(result.trendSlope).toBeCloseTo(1000, 0);
    // Next month after 6000 should be ~7000, then 8000, 9000.
    expect(result.forecastTotals[0]).toBeCloseTo(7000, -1);
    expect(result.forecastTotals[1]).toBeGreaterThan(result.forecastTotals[0]);
    expect(result.forecastTotals[2]).toBeGreaterThan(result.forecastTotals[1]);
  });

  it("floors the forecast at the active recurring baseline", () => {
    const txns: ForecastTxn[] = [expense("2024-05-10", 500)];
    const recurring: ForecastRecurring[] = [
      { type: "expense", amount: 8000, frequency: "monthly", is_active: true },
      { type: "expense", amount: 1200, frequency: "monthly", is_active: false }, // ignored
      { type: "income", amount: 50000, frequency: "monthly", is_active: true }, // ignored
    ];
    const result = computeExpenseForecast(txns, recurring, { now: NOW, horizon: 3 });

    expect(result.recurringBaseline).toBeCloseTo(8000, 5);
    result.forecastTotals.forEach((v) => expect(v).toBeGreaterThanOrEqual(8000));
  });

  it("handles no data gracefully", () => {
    const result = computeExpenseForecast([], [], { now: NOW, horizon: 3 });
    expect(result.monthsOfData).toBe(0);
    expect(result.avgMonthly).toBe(0);
    expect(result.forecastTotals).toEqual([0, 0, 0]);
    expect(result.confidence).toBe("low");
    expect(result.categoryForecasts).toEqual([]);
  });

  it("builds per-category forecasts from the last 3 months", () => {
    const txns: ForecastTxn[] = [
      // last 3 completed months: Mar, Apr, May 2024
      expense("2024-03-10", 3000, "food"),
      expense("2024-04-10", 3000, "food"),
      expense("2024-05-10", 3000, "food"),
      expense("2024-05-10", 1500, "transport"),
      // older month should not count toward category averages
      expense("2023-12-10", 9000, "food"),
    ];
    const result = computeExpenseForecast(txns, [], { now: NOW, horizon: 3 });

    const food = result.categoryForecasts.find((c) => c.categoryId === "food");
    const transport = result.categoryForecasts.find((c) => c.categoryId === "transport");
    expect(food?.monthly).toBeCloseTo(3000, 0); // 9000 over 3 months
    expect(transport?.monthly).toBeCloseTo(500, 0); // 1500 over 3 months
    // sorted by amount desc
    expect(result.categoryForecasts[0].categoryId).toBe("food");
  });

  it("emits horizon future points plus history for charting", () => {
    const txns: ForecastTxn[] = [
      expense("2024-04-10", 5000),
      expense("2024-05-10", 5000),
    ];
    const result = computeExpenseForecast(txns, [], { now: NOW, horizon: 3 });

    const future = result.points.filter((p) => p.isFuture);
    expect(future).toHaveLength(3);
    expect(future[0].month).toBe("2024-06");
    expect(future[2].month).toBe("2024-08");
    // The last historical point carries a forecast value to bridge the lines.
    const lastActual = result.points.filter((p) => !p.isFuture).at(-1);
    expect(lastActual?.forecast).not.toBeNull();
  });
});
