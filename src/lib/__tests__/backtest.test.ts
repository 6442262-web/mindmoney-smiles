import { describe, it, expect } from "vitest";
import { backtestSeries } from "@/lib/backtest";

describe("backtestSeries", () => {
  it("scores zero error on a perfectly flat series", () => {
    const series = new Array(12).fill(5000);
    const r = backtestSeries(series, { horizon: 3, minTrain: 4 });

    expect(r.origins).toBeGreaterThan(0);
    expect(r.overall.mae).toBeCloseTo(0, 6);
    expect(r.overall.rmse).toBeCloseTo(0, 6);
    expect(r.overall.mape).toBeCloseTo(0, 6);
  });

  it("beats the naive last-value baseline on a clean linear trend", () => {
    // 1000, 2000, ... 12000 — a trend model should track this far better
    // than predicting the last observed value.
    const series = Array.from({ length: 12 }, (_, i) => (i + 1) * 1000);
    const r = backtestSeries(series, { horizon: 3, minTrain: 4 });

    expect(r.overall.rmse).toBeLessThan(r.naiveLast.rmse);
    expect(r.skillVsLast).toBeGreaterThan(0);
  });

  it("reports error growing with the horizon on a trend", () => {
    const series = Array.from({ length: 12 }, (_, i) => (i + 1) * 1000);
    const r = backtestSeries(series, { horizon: 3, minTrain: 4 });

    expect(r.byHorizon).toHaveLength(3);
    // 1-step-ahead should be at least as accurate as 3-step-ahead.
    expect(r.byHorizon[0].mae).toBeLessThanOrEqual(r.byHorizon[2].mae);
  });

  it("returns empty metrics when there isn't enough data to score", () => {
    const r = backtestSeries([100, 200, 300], { horizon: 3, minTrain: 4 });
    expect(r.origins).toBe(0);
    expect(r.overall.n).toBe(0);
    expect(r.overall.rmse).toBe(0);
    expect(r.skillVsLast).toBe(0);
  });

  it("counts scored pairs correctly near the end of the series", () => {
    // 6 points, minTrain 4, horizon 3:
    //   origin t=4 -> scores idx 4,5            (2 pairs)
    //   origin t=5 -> scores idx 5              (1 pair)
    const series = [1, 2, 3, 4, 5, 6];
    const r = backtestSeries(series, { horizon: 3, minTrain: 4 });
    expect(r.origins).toBe(2);
    expect(r.overall.n).toBe(3);
  });
});
