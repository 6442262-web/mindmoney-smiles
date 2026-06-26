/**
 * Expense forecasting engine (pure, client-side, no network).
 *
 * Forecasts future monthly expenses from historical transactions plus known
 * recurring commitments:
 *
 *   1. Bucket historical expenses into completed calendar months.
 *   2. Fit an exponential-smoothing model to the monthly series — Holt-Winters
 *      (trend + seasonality) when there are 2+ years of data, Holt (trend) for
 *      shorter histories. The smoothing parameters are fitted to the user's own
 *      data, so recent months are weighted more heavily than old ones.
 *   3. Project forward, floored by the active recurring-expense baseline (you
 *      can't realistically spend less than your committed bills).
 *   4. Derive a confidence band from the model's in-sample error.
 *
 * Everything is a pure function of its inputs (with an injectable `now`) so it
 * is straightforward to unit-test.
 */
import { parseLocalDate } from "@/lib/dateUtils";
import { forecastSeries, type SmoothingMethod } from "@/lib/expSmoothing";

export interface ForecastTxn {
  type: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category_id?: string | null;
}

export interface ForecastRecurring {
  type: string;
  amount: number;
  frequency: string; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  is_active?: boolean | null;
}

export interface MonthlyPoint {
  /** 'YYYY-MM' key */
  month: string;
  /** Actual expense total for completed historical months, else null. */
  actual: number | null;
  /** Forecast value for future months (and the bridge point), else null. */
  forecast: number | null;
  /** True for projected months. */
  isFuture: boolean;
}

export interface CategoryForecast {
  categoryId: string;
  /** Forecast spend per month for this category. */
  monthly: number;
}

export type Confidence = "low" | "medium" | "high";

export interface ForecastResult {
  /** Chronological history + forecast points for charting. */
  points: MonthlyPoint[];
  /** Number of completed historical months actually used. */
  monthsOfData: number;
  /** Mean of historical monthly expense totals. */
  avgMonthly: number;
  /** Monthly trend (change in baht per month); positive = rising. */
  trendSlope: number;
  /** Sum of active recurring expenses normalised to a monthly amount. */
  recurringBaseline: number;
  /** Forecast totals for each future month, length === horizon. */
  forecastTotals: number[];
  /** Mean forecast per future month. */
  forecastAvg: number;
  /** Lower / upper bound per future month (confidence band). */
  lower: number[];
  upper: number[];
  confidence: Confidence;
  /** Which smoothing model was fitted. */
  method: SmoothingMethod;
  /** Fitted smoothing parameters (alpha/beta/gamma/period). */
  params: { alpha?: number; beta?: number; gamma?: number; period?: number };
  /** Per-category monthly forecast, sorted by amount desc. */
  categoryForecasts: CategoryForecast[];
}

export interface ForecastOptions {
  /** Reference "today". Defaults to new Date(). */
  now?: Date;
  /** How many future months to project. Default 3. */
  horizon?: number;
  /** How many completed months of history to consider. Default 24. */
  lookback?: number;
}

const MS_WEEKS_PER_MONTH = 4.345; // avg weeks/month
const DAYS_PER_MONTH = 30.4;

function monthKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

/** Normalise a recurring transaction's amount to a per-month figure. */
export function recurringMonthlyAmount(r: ForecastRecurring): number {
  switch (r.frequency) {
    case "daily":
      return r.amount * DAYS_PER_MONTH;
    case "weekly":
      return r.amount * MS_WEEKS_PER_MONTH;
    case "yearly":
      return r.amount / 12;
    case "monthly":
    default:
      return r.amount;
  }
}

export function computeExpenseForecast(
  transactions: ForecastTxn[],
  recurring: ForecastRecurring[],
  options: ForecastOptions = {}
): ForecastResult {
  const now = options.now ?? new Date();
  const horizon = options.horizon ?? 3;
  const lookback = options.lookback ?? 24;

  const recurringBaseline = recurring
    .filter((r) => r.type === "expense" && r.is_active !== false)
    .reduce((s, r) => s + recurringMonthlyAmount(r), 0);

  // Build the list of completed months to analyse: the `lookback` months that
  // come strictly before the current (partial) month.
  const completedMonths: { year: number; month0: number; key: string }[] = [];
  for (let i = lookback; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    completedMonths.push({ year: d.getFullYear(), month0: d.getMonth(), key: monthKey(d.getFullYear(), d.getMonth()) });
  }

  // Sum expenses per month key, and per category for the last 3 completed months.
  const totalsByKey = new Map<string, number>();
  completedMonths.forEach((m) => totalsByKey.set(m.key, 0));

  const recentCategoryKeys = new Set(completedMonths.slice(-3).map((m) => m.key));
  const recentCount = Math.min(3, completedMonths.length);
  const categoryTotals = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const d = parseLocalDate(t.date);
    const key = monthKey(d.getFullYear(), d.getMonth());
    if (totalsByKey.has(key)) {
      totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + t.amount);
    }
    if (recentCategoryKeys.has(key)) {
      const cat = t.category_id || "uncategorized";
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + t.amount);
    }
  }

  // Trim leading months that precede the user's first recorded expense so empty
  // pre-history doesn't drag the trend down.
  const orderedTotals = completedMonths.map((m) => totalsByKey.get(m.key) ?? 0);
  let firstNonZero = orderedTotals.findIndex((v) => v > 0);
  if (firstNonZero === -1) firstNonZero = orderedTotals.length; // no data at all
  const usedMonths = completedMonths.slice(firstNonZero);
  const usedTotals = orderedTotals.slice(firstNonZero);
  const monthsOfData = usedTotals.length;

  const avgMonthly = monthsOfData > 0 ? usedTotals.reduce((s, v) => s + v, 0) / monthsOfData : 0;

  // Fit an exponential-smoothing model to the monthly series (Holt-Winters when
  // there are 2+ years of data, otherwise Holt / SES). Seasonal period 12 =
  // yearly seasonality on monthly data.
  const fit = forecastSeries(usedTotals, { horizon, seasonalPeriod: 12 });

  // Confidence band from the model's relative in-sample error.
  let band = 0.35;
  let confidence: Confidence = "low";
  if (monthsOfData >= 2 && avgMonthly > 0) {
    const cov = fit.rmse / avgMonthly; // relative error
    band = Math.min(0.5, Math.max(0.08, cov));
    if (monthsOfData >= 6 && cov < 0.15) confidence = "high";
    else if (monthsOfData >= 3 && cov < 0.3) confidence = "medium";
    else confidence = "low";
  }

  // Floor each projected month at the recurring baseline (committed bills).
  const forecastTotals: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];
  for (let j = 0; j < horizon; j++) {
    const projected = Math.max(fit.forecast[j] ?? 0, recurringBaseline, 0);
    forecastTotals.push(projected);
    lower.push(Math.max(recurringBaseline, projected * (1 - band)));
    upper.push(projected * (1 + band));
  }
  const forecastAvg =
    forecastTotals.length > 0 ? forecastTotals.reduce((s, v) => s + v, 0) / forecastTotals.length : 0;

  // Assemble chart points: historical actuals then future forecasts. Bridge the
  // two series by giving the last actual month a forecast value too.
  const points: MonthlyPoint[] = usedMonths.map((m, i) => ({
    month: m.key,
    actual: usedTotals[i],
    forecast: i === usedMonths.length - 1 ? usedTotals[i] : null,
    isFuture: false,
  }));
  for (let j = 0; j < horizon; j++) {
    const d = new Date(now.getFullYear(), now.getMonth() + j, 1);
    points.push({
      month: monthKey(d.getFullYear(), d.getMonth()),
      actual: null,
      forecast: forecastTotals[j],
      isFuture: true,
    });
  }

  const categoryForecasts: CategoryForecast[] = Array.from(categoryTotals.entries())
    .map(([categoryId, total]) => ({ categoryId, monthly: recentCount > 0 ? total / recentCount : 0 }))
    .filter((c) => c.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly);

  return {
    points,
    monthsOfData,
    avgMonthly,
    trendSlope: fit.trend,
    recurringBaseline,
    forecastTotals,
    forecastAvg,
    lower,
    upper,
    confidence,
    method: fit.method,
    params: fit.params,
    categoryForecasts,
  };
}
