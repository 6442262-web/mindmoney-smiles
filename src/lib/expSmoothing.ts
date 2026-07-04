/**
 * Exponential smoothing forecasters (Holt's linear trend and Holt-Winters
 * additive seasonality), with simple grid-search parameter fitting.
 *
 * "Training" here means fitting the smoothing parameters (alpha/beta/gamma) to
 * the user's own series by minimising one-step-ahead squared error. This gives a
 * genuine fitted model that weights recent observations more heavily than old
 * ones — more responsive than ordinary least-squares linear regression — while
 * staying tiny, deterministic, and fully client-side.
 */

export type SmoothingMethod = "holt-winters" | "holt" | "ses" | "flat";

export interface SmoothingFit {
  method: SmoothingMethod;
  /** Forecast values, length === horizon. */
  forecast: number[];
  /** One-step-ahead in-sample fitted values (for residual/error analysis). */
  fitted: number[];
  /** Index in `series` that each fitted value predicts (fitted[k] -> series[fittedStart + k]). */
  fittedStart: number;
  /** Root mean squared one-step error over the fitted region. */
  rmse: number;
  /** Final smoothed level of the series. */
  level: number;
  /** Per-step trend component (0 when the model has no trend term). */
  trend: number;
  params: { alpha?: number; beta?: number; gamma?: number; period?: number };
}

const ALPHA_GRID = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function rmseOf(series: number[], fitted: number[], fittedStart: number): number {
  if (fitted.length === 0) return 0;
  let sse = 0;
  for (let k = 0; k < fitted.length; k++) {
    const actual = series[fittedStart + k];
    sse += (actual - fitted[k]) ** 2;
  }
  return Math.sqrt(sse / fitted.length);
}

/** Simple exponential smoothing (level only, no trend). */
export function ses(series: number[], horizon: number, alpha: number): { forecast: number[]; fitted: number[] } {
  const n = series.length;
  if (n === 0) return { forecast: new Array(horizon).fill(0), fitted: [] };
  let level = series[0];
  const fitted: number[] = [];
  for (let t = 1; t < n; t++) {
    fitted.push(level); // one-step-ahead forecast made at t-1
    level = alpha * series[t] + (1 - alpha) * level;
  }
  return { forecast: new Array(horizon).fill(level), fitted };
}

/** Holt's linear trend method (double exponential smoothing). */
export function holt(
  series: number[],
  horizon: number,
  alpha: number,
  beta: number
): { forecast: number[]; fitted: number[]; level: number; trend: number } {
  const n = series.length;
  if (n === 0) return { forecast: new Array(horizon).fill(0), fitted: [], level: 0, trend: 0 };
  let level = series[0];
  let trend = n >= 2 ? series[1] - series[0] : 0;
  const fitted: number[] = [];
  for (let t = 1; t < n; t++) {
    fitted.push(level + trend); // forecast for index t, made at t-1
    const prevLevel = level;
    level = alpha * series[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const forecast: number[] = [];
  for (let h = 1; h <= horizon; h++) forecast.push(level + h * trend);
  return { forecast, fitted, level, trend };
}

/** Holt-Winters additive seasonal method (triple exponential smoothing). */
export function holtWinters(
  series: number[],
  horizon: number,
  period: number,
  alpha: number,
  beta: number,
  gamma: number
): { forecast: number[]; fitted: number[]; level: number; trend: number } {
  const n = series.length;
  if (n < 2 * period) {
    // Not enough data for seasonality; caller should avoid this, but degrade safely.
    return { ...holt(series, horizon, alpha, beta) };
  }
  const firstSeason = series.slice(0, period);
  const secondSeason = series.slice(period, 2 * period);
  let level = mean(firstSeason);
  let trend = (mean(secondSeason) - mean(firstSeason)) / period;
  const seasonals = firstSeason.map((v) => v - level); // additive seasonal indices

  const fitted: number[] = [];
  for (let t = period; t < n; t++) {
    const sIdx = t % period;
    const seasonal = seasonals[sIdx];
    fitted.push(level + trend + seasonal); // forecast for index t
    const prevLevel = level;
    level = alpha * (series[t] - seasonal) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonals[sIdx] = gamma * (series[t] - level) + (1 - gamma) * seasonal;
  }

  const forecast: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const sIdx = (n + h - 1) % period;
    forecast.push(level + h * trend + seasonals[sIdx]);
  }
  return { forecast, fitted, level, trend };
}

function fitHolt(series: number[], horizon: number): SmoothingFit {
  let best: SmoothingFit | null = null;
  for (const alpha of ALPHA_GRID) {
    for (const beta of ALPHA_GRID) {
      const { forecast, fitted, level, trend } = holt(series, horizon, alpha, beta);
      const rmse = rmseOf(series, fitted, 1);
      if (!best || rmse < best.rmse) {
        best = { method: "holt", forecast, fitted, fittedStart: 1, rmse, level, trend, params: { alpha, beta } };
      }
    }
  }
  return best!;
}

function fitHoltWinters(series: number[], horizon: number, period: number): SmoothingFit {
  let best: SmoothingFit | null = null;
  for (const alpha of ALPHA_GRID) {
    for (const beta of ALPHA_GRID) {
      for (const gamma of ALPHA_GRID) {
        const { forecast, fitted, level, trend } = holtWinters(series, horizon, period, alpha, beta, gamma);
        const rmse = rmseOf(series, fitted, period);
        if (!best || rmse < best.rmse) {
          best = {
            method: "holt-winters",
            forecast,
            fitted,
            fittedStart: period,
            rmse,
            level,
            trend,
            params: { alpha, beta, gamma, period },
          };
        }
      }
    }
  }
  return best!;
}

function fitSes(series: number[], horizon: number): SmoothingFit {
  let best: SmoothingFit | null = null;
  for (const alpha of ALPHA_GRID) {
    const { forecast, fitted } = ses(series, horizon, alpha);
    const rmse = rmseOf(series, fitted, 1);
    if (!best || rmse < best.rmse) {
      best = { method: "ses", forecast, fitted, fittedStart: 1, rmse, level: forecast[0] ?? 0, trend: 0, params: { alpha } };
    }
  }
  return best!;
}

export interface ForecastSeriesOptions {
  horizon: number;
  /** Seasonal period to attempt (e.g. 12 for yearly-on-monthly). Default 12. */
  seasonalPeriod?: number;
}

/**
 * Pick and fit the most appropriate smoothing model for a series, based on how
 * much history is available, then forecast `horizon` steps ahead.
 *
 *   - >= 2 full seasonal cycles  -> Holt-Winters (trend + seasonality)
 *   - >= 4 points                -> Holt (trend)
 *   - 2-3 points                 -> SES (level)
 *   - <= 1 point                 -> flat
 */
export function forecastSeries(series: number[], options: ForecastSeriesOptions): SmoothingFit {
  const { horizon } = options;
  const period = options.seasonalPeriod ?? 12;
  const n = series.length;

  if (n <= 1) {
    const value = n === 1 ? series[0] : 0;
    return { method: "flat", forecast: new Array(horizon).fill(value), fitted: [], fittedStart: 0, rmse: 0, level: value, trend: 0, params: {} };
  }
  if (n >= 2 * period) return fitHoltWinters(series, horizon, period);
  if (n >= 4) return fitHolt(series, horizon);
  return fitSes(series, horizon);
}
