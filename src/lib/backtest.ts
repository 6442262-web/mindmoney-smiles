/**
 * Walk-forward backtesting for the expense-forecasting engine.
 *
 * Evaluates how well {@link forecastSeries} would actually have predicted the
 * future, using only information available at each point in time:
 *
 *   for each origin t (>= minTrain):
 *     train = series[0 .. t)
 *     fit   = forecastSeries(train)          // model sees only the past
 *     compare fit.forecast[k] to series[t + k] for each horizon step k
 *
 * Errors are accumulated overall and per horizon step, alongside two naive
 * baselines — "last value" (random walk) and "train mean" — so a skill score
 * tells you whether the model genuinely beats the trivial alternatives.
 *
 * Pure and deterministic: same series in, same metrics out.
 */
import { forecastSeries } from "@/lib/expSmoothing";

export interface BacktestMetrics {
  /** Mean absolute error. */
  mae: number;
  /** Root mean squared error. */
  rmse: number;
  /** Mean absolute percentage error (%), over points with a non-zero actual. */
  mape: number;
  /** Number of (forecast, actual) pairs scored. */
  n: number;
}

export interface BacktestResult {
  /** Aggregated error across every horizon step and origin. */
  overall: BacktestMetrics;
  /** Error per horizon step; byHorizon[0] is the 1-step-ahead forecast. */
  byHorizon: BacktestMetrics[];
  /** Baseline: predict the last observed value for every step. */
  naiveLast: BacktestMetrics;
  /** Baseline: predict the training mean for every step. */
  naiveMean: BacktestMetrics;
  /**
   * Skill vs. the last-value baseline: 1 - rmse(model) / rmse(naiveLast).
   * > 0 means the model beats a random walk; 0 ties; < 0 is worse.
   */
  skillVsLast: number;
  /** Number of walk-forward origins evaluated. */
  origins: number;
}

export interface BacktestOptions {
  /** Steps ahead to forecast and score at each origin. Default 3. */
  horizon?: number;
  /** Minimum training points before the first origin. Default 4. */
  minTrain?: number;
  /** Seasonal period passed through to the model. Default 12. */
  seasonalPeriod?: number;
}

interface Accumulator {
  absSum: number;
  sqSum: number;
  apeSum: number;
  apeN: number;
  n: number;
}

function newAcc(): Accumulator {
  return { absSum: 0, sqSum: 0, apeSum: 0, apeN: 0, n: 0 };
}

function record(acc: Accumulator, actual: number, pred: number): void {
  const err = actual - pred;
  acc.absSum += Math.abs(err);
  acc.sqSum += err * err;
  acc.n += 1;
  if (actual !== 0) {
    acc.apeSum += Math.abs(err / actual);
    acc.apeN += 1;
  }
}

function finalize(acc: Accumulator): BacktestMetrics {
  return {
    mae: acc.n ? acc.absSum / acc.n : 0,
    rmse: acc.n ? Math.sqrt(acc.sqSum / acc.n) : 0,
    mape: acc.apeN ? (acc.apeSum / acc.apeN) * 100 : 0,
    n: acc.n,
  };
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

/**
 * Run a walk-forward backtest over a numeric series (e.g. monthly expense
 * totals). Needs at least `minTrain + 1` points to score anything.
 */
export function backtestSeries(series: number[], options: BacktestOptions = {}): BacktestResult {
  const horizon = options.horizon ?? 3;
  const minTrain = options.minTrain ?? 4;
  const seasonalPeriod = options.seasonalPeriod ?? 12;
  const n = series.length;

  const overall = newAcc();
  const byHorizon: Accumulator[] = Array.from({ length: horizon }, newAcc);
  const naiveLast = newAcc();
  const naiveMean = newAcc();
  let origins = 0;

  for (let t = minTrain; t < n; t++) {
    const train = series.slice(0, t);
    const fit = forecastSeries(train, { horizon, seasonalPeriod });
    const lastValue = train[train.length - 1];
    const trainMean = mean(train);
    let scoredHere = false;

    for (let k = 0; k < horizon; k++) {
      const idx = t + k;
      if (idx >= n) break;
      const actual = series[idx];
      record(overall, actual, fit.forecast[k] ?? lastValue);
      record(byHorizon[k], actual, fit.forecast[k] ?? lastValue);
      record(naiveLast, actual, lastValue);
      record(naiveMean, actual, trainMean);
      scoredHere = true;
    }
    if (scoredHere) origins += 1;
  }

  const modelRmse = finalize(overall).rmse;
  const naiveLastRmse = finalize(naiveLast).rmse;
  const skillVsLast = naiveLastRmse > 0 ? 1 - modelRmse / naiveLastRmse : 0;

  return {
    overall: finalize(overall),
    byHorizon: byHorizon.map(finalize),
    naiveLast: finalize(naiveLast),
    naiveMean: finalize(naiveMean),
    skillVsLast,
    origins,
  };
}
