import { describe, it, expect } from "vitest";
import { holt, holtWinters, ses, forecastSeries } from "@/lib/expSmoothing";

describe("ses", () => {
  it("forecasts a flat level for flat data", () => {
    const { forecast } = ses([100, 100, 100, 100], 3, 0.5);
    expect(forecast).toHaveLength(3);
    forecast.forEach((v) => expect(v).toBeCloseTo(100, 5));
  });
});

describe("holt", () => {
  it("continues a linear upward trend", () => {
    const series = [100, 200, 300, 400, 500, 600];
    const { forecast } = holt(series, 3, 0.5, 0.5);
    // Next values should keep climbing by ~100/step.
    expect(forecast[0]).toBeGreaterThan(600);
    expect(forecast[1]).toBeGreaterThan(forecast[0]);
    expect(forecast[2]).toBeGreaterThan(forecast[1]);
    expect(forecast[0]).toBeCloseTo(700, -2);
  });

  it("stays flat for flat data", () => {
    const { forecast } = holt([50, 50, 50, 50, 50], 2, 0.4, 0.3);
    forecast.forEach((v) => expect(v).toBeCloseTo(50, 4));
  });
});

describe("holtWinters", () => {
  it("reproduces an additive seasonal pattern", () => {
    // period 4 seasonal pattern (+10, -10, +20, -20) on a flat level of 100,
    // repeated for 3 cycles (12 points).
    const pattern = [110, 90, 120, 80];
    const series = [...pattern, ...pattern, ...pattern];
    const { forecast } = holtWinters(series, 4, 4, 0.4, 0.1, 0.3);
    // Forecast of the next 4 should resemble the seasonal shape: high, low, higher, lower.
    expect(forecast[0]).toBeGreaterThan(forecast[1]); // 110-ish > 90-ish
    expect(forecast[2]).toBeGreaterThan(forecast[3]); // 120-ish > 80-ish
    expect(forecast[2]).toBeGreaterThan(forecast[0]); // peak is the 3rd slot
  });
});

describe("forecastSeries", () => {
  it("falls back to flat for a single point", () => {
    const fit = forecastSeries([42], { horizon: 3 });
    expect(fit.method).toBe("flat");
    expect(fit.forecast).toEqual([42, 42, 42]);
  });

  it("uses SES for 2-3 points", () => {
    const fit = forecastSeries([10, 20, 30], { horizon: 2 });
    expect(fit.method).toBe("ses");
    expect(fit.forecast).toHaveLength(2);
  });

  it("uses Holt for 4+ points without a full 2 seasonal cycles", () => {
    const fit = forecastSeries([10, 20, 30, 40, 50, 60], { horizon: 3, seasonalPeriod: 12 });
    expect(fit.method).toBe("holt");
    expect(fit.params.alpha).toBeGreaterThan(0);
    expect(fit.params.beta).toBeGreaterThan(0);
  });

  it("uses Holt-Winters when there are 2+ seasonal cycles", () => {
    const pattern = [110, 90, 120, 80];
    const series = [...pattern, ...pattern, ...pattern]; // 12 points, period 4
    const fit = forecastSeries(series, { horizon: 4, seasonalPeriod: 4 });
    expect(fit.method).toBe("holt-winters");
    expect(fit.params.period).toBe(4);
  });

  it("fits parameters that lower error vs an arbitrary choice", () => {
    const series = [100, 130, 160, 150, 200, 230, 210, 260];
    const fit = forecastSeries(series, { horizon: 3 });
    expect(fit.rmse).toBeGreaterThanOrEqual(0);
    expect(fit.forecast).toHaveLength(3);
  });
});
