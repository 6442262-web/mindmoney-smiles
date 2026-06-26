import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Sparkles, Loader2, AlertTriangle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { computeExpenseForecast } from "@/lib/forecast";
import { parseLocalDate } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ComposedChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const fmt = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n);

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${String((y + 543) % 100).padStart(2, "0")}`;
}

const confidenceMeta: Record<string, { label: string; className: string }> = {
  high: { label: "ความเชื่อมั่นสูง", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  medium: { label: "ความเชื่อมั่นปานกลาง", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  low: { label: "ความเชื่อมั่นต่ำ", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const methodLabel: Record<string, string> = {
  "holt-winters": "Holt-Winters (เทรนด์ + ฤดูกาล)",
  holt: "Holt (เทรนด์)",
  ses: "Exponential Smoothing",
  flat: "ค่าคงที่",
};

interface AiSummary {
  summary: string;
  advice: string[];
}

export function ExpenseForecast() {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { recurringTransactions } = useRecurringTransactions();
  const { toast } = useToast();

  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState<AiSummary | null>(null);

  const forecast = useMemo(
    () => computeExpenseForecast(transactions, recurringTransactions, { horizon: 3, lookback: 6 }),
    [transactions, recurringTransactions]
  );

  // Average monthly income over the same lookback window (for AI context + ratio).
  const monthlyIncome = useMemo(() => {
    const now = new Date();
    const totalsByKey = new Map<string, number>();
    for (let i = 6; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      totalsByKey.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    for (const t of transactions) {
      if (t.type !== "income") continue;
      const d = parseLocalDate(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (totalsByKey.has(key)) totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + t.amount);
    }
    const vals = Array.from(totalsByKey.values());
    const active = vals.filter((v) => v > 0);
    return active.length > 0 ? active.reduce((s, v) => s + v, 0) / active.length : 0;
  }, [transactions]);

  const chartData = useMemo(
    () => forecast.points.map((p) => ({ name: monthLabel(p.month), actual: p.actual, forecast: p.forecast })),
    [forecast]
  );

  const categoryForecasts = useMemo(
    () =>
      forecast.categoryForecasts.slice(0, 8).map((c) => {
        const cat = categories.find((x) => x.id === c.categoryId);
        return { ...c, name: cat?.name ?? (c.categoryId === "uncategorized" ? "ไม่ระบุหมวด" : c.categoryId), color: cat?.color };
      }),
    [forecast, categories]
  );

  const overBudget = monthlyIncome > 0 && forecast.forecastAvg > monthlyIncome;
  const trendUp = forecast.trendSlope > 0;
  const hasData = forecast.monthsOfData > 0;

  const handleAiSummary = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("forecast-summary", {
        body: {
          forecast: {
            avgMonthly: forecast.avgMonthly,
            trendSlope: forecast.trendSlope,
            recurringBaseline: forecast.recurringBaseline,
            forecastTotals: forecast.forecastTotals,
            forecastAvg: forecast.forecastAvg,
            monthsOfData: forecast.monthsOfData,
            confidence: forecast.confidence,
            method: forecast.method,
            monthlyIncome,
            categories: categoryForecasts.map((c) => ({ name: c.name, monthly: c.monthly })),
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAi({ summary: data.summary ?? "", advice: Array.isArray(data.advice) ? data.advice : [] });
    } catch (err) {
      console.error("forecast-summary error:", err);
      toast({
        title: "สรุปด้วย AI ไม่สำเร็จ",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const conf = confidenceMeta[forecast.confidence];

  return (
    <div className="pb-20 px-4 pt-6 space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/summary">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">🔮 คาดการณ์รายจ่ายล่วงหน้า</h1>
          <p className="text-xs text-muted-foreground">ประเมินรายจ่าย 3 เดือนข้างหน้าจากประวัติและรายการประจำ</p>
        </div>
      </div>

      {!hasData ? (
        <Card className="p-8 text-center space-y-2">
          <Info className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">ยังมีข้อมูลรายจ่ายไม่เพียงพอสำหรับการคาดการณ์</p>
          <p className="text-xs text-muted-foreground">บันทึกรายจ่ายอย่างน้อย 1-2 เดือนเพื่อเริ่มคาดการณ์</p>
        </Card>
      ) : (
        <>
          {/* Headline forecast */}
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">คาดการณ์รายจ่ายเฉลี่ย/เดือน</p>
                <p className={cn("text-2xl font-bold", overBudget ? "text-red-600" : "text-foreground")}>
                  {fmt(forecast.forecastAvg)}
                </p>
                {monthlyIncome > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {((forecast.forecastAvg / monthlyIncome) * 100).toFixed(0)}% ของรายรับเฉลี่ย ({fmt(monthlyIncome)})
                  </p>
                )}
              </div>
              <Badge className={cn("border-0", conf.className)}>{conf.label}</Badge>
            </div>

            <div className="flex items-center gap-2 mt-3 text-sm">
              {trendUp ? (
                <span className="flex items-center gap-1 text-red-500"><TrendingUp className="h-4 w-4" /> แนวโน้มเพิ่มขึ้น</span>
              ) : forecast.trendSlope < 0 ? (
                <span className="flex items-center gap-1 text-green-500"><TrendingDown className="h-4 w-4" /> แนวโน้มลดลง</span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-4 w-4" /> แนวโน้มคงที่</span>
              )}
              <span className="text-muted-foreground">
                ({forecast.trendSlope >= 0 ? "+" : ""}{fmt(forecast.trendSlope)}/เดือน)
              </span>
            </div>
          </Card>

          {overBudget && (
            <Card className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-red-700 dark:text-red-400">
                  รายจ่ายคาดการณ์สูงกว่ารายรับเฉลี่ย — มีความเสี่ยงที่จะใช้จ่ายเกินตัวในเดือนข้างหน้า
                </span>
              </div>
            </Card>
          )}

          {/* Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-1">แนวโน้มรายจ่าย</h3>
            <p className="text-[11px] text-muted-foreground mb-3">เส้นทึบ = ข้อมูลจริง · เส้นประ = คาดการณ์</p>
            <ChartContainer config={{ actual: { label: "จริง" }, forecast: { label: "คาดการณ์" } }} className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmt(value), name === "actual" ? "จริง" : "คาดการณ์"]}
                  />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          {/* Month-by-month forecast */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">รายละเอียดรายเดือน</h3>
            <div className="space-y-2">
              {forecast.forecastTotals.map((total, i) => {
                const futurePoint = forecast.points.filter((p) => p.isFuture)[i];
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{futurePoint ? monthLabel(futurePoint.month) : `เดือน +${i + 1}`}</span>
                    <div className="text-right">
                      <span className="font-bold">{fmt(total)}</span>
                      <div className="text-[10px] text-muted-foreground">
                        ช่วง {fmt(forecast.lower[i])} – {fmt(forecast.upper[i])}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="border-t pt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ค่าใช้จ่ายประจำขั้นต่ำ</span>
                <span className="font-medium">{fmt(forecast.recurringBaseline)}/เดือน</span>
              </div>
            </div>
          </Card>

          {/* Per-category forecast */}
          {categoryForecasts.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">คาดการณ์ตามหมวดหมู่ (เฉลี่ย/เดือน)</h3>
              <div className="space-y-2">
                {categoryForecasts.map((c) => (
                  <div key={c.categoryId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      {c.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />}
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="font-medium shrink-0">{fmt(c.monthly)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* AI summary */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> สรุปและคำแนะนำด้วย AI
              </h3>
              <Button size="sm" variant="outline" onClick={handleAiSummary} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {ai ? "วิเคราะห์อีกครั้ง" : "วิเคราะห์"}
              </Button>
            </div>

            {!ai && !aiLoading && (
              <p className="text-xs text-muted-foreground">กดปุ่ม “วิเคราะห์” เพื่อให้ AI สรุปแนวโน้มและให้คำแนะนำการใช้จ่าย</p>
            )}

            {ai && (
              <div className="space-y-3">
                <p className="text-sm">{ai.summary}</p>
                {ai.advice.length > 0 && (
                  <ul className="space-y-1.5">
                    {ai.advice.map((a, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span className="text-muted-foreground">{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <p className="text-[10px] text-muted-foreground text-center px-4">
            * โมเดล: {methodLabel[forecast.method] ?? forecast.method} · อ้างอิงข้อมูลย้อนหลัง {forecast.monthsOfData} เดือนและรายการประจำ เป็นการประมาณการเท่านั้น
          </p>
        </>
      )}
    </div>
  );
}
