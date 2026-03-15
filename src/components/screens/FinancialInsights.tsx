import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Lightbulb, AlertTriangle, CheckCircle, Target, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ComparisonPeriod = "month" | "quarter" | "year";

interface CategoryInsight {
  category: string;
  categoryName: string;
  currentAmount: number;
  previousAmount: number;
  change: number;
  changePercent: number;
  type: string;
}

export function FinancialInsights() {
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("month");
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { recurringTransactions } = useRecurringTransactions();

  const insights = useMemo(() => {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    switch (comparisonPeriod) {
      case "month":
        currentStart = startOfMonth(now);
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 1));
        previousEnd = endOfMonth(subMonths(now, 1));
        break;
      case "quarter": {
        const cq = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), cq * 3, 1);
        currentEnd = new Date(now.getFullYear(), (cq + 1) * 3, 0);
        previousStart = new Date(now.getFullYear(), (cq - 1) * 3, 1);
        previousEnd = new Date(now.getFullYear(), cq * 3, 0);
        break;
      }
      case "year":
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }

    const currentTxns = transactions.filter(t => { const d = new Date(t.date); return d >= currentStart && d <= currentEnd; });
    const previousTxns = transactions.filter(t => { const d = new Date(t.date); return d >= previousStart && d <= previousEnd; });

    const currentIncome = currentTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const previousIncome = previousTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const currentExpense = currentTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const previousExpense = previousTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Savings rate
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;
    const prevSavingsRate = previousIncome > 0 ? ((previousIncome - previousExpense) / previousIncome) * 100 : 0;

    // Daily avg spending
    const daysElapsed = Math.max(differenceInDays(now, currentStart), 1);
    const dailyAvg = currentExpense / daysElapsed;
    const prevDays = Math.max(differenceInDays(previousEnd, previousStart), 1);
    const prevDailyAvg = previousExpense / prevDays;

    // Spending velocity (projected monthly spending)
    const daysInPeriod = differenceInDays(currentEnd, currentStart) + 1;
    const projectedExpense = (currentExpense / daysElapsed) * daysInPeriod;

    // Budget health
    const totalBudget = accounts.reduce((s, a) => s + (a.budget_limit || 0), 0);
    const budgetHealth = totalBudget > 0 ? Math.max(0, 100 - (currentExpense / totalBudget) * 100) : -1;

    // Recurring burden
    const monthlyRecurring = recurringTransactions
      .filter(r => r.type === 'expense' && r.is_active)
      .reduce((s, r) => {
        if (r.frequency === 'daily') return s + r.amount * 30;
        if (r.frequency === 'weekly') return s + r.amount * 4;
        return s + r.amount;
      }, 0);
    const recurringPercent = currentExpense > 0 ? (monthlyRecurring / currentExpense) * 100 : 0;

    // Category insights
    const categoryMap = new Map<string, { current: number; previous: number; type: string }>();
    currentTxns.forEach(t => {
      const cat = t.category_id || 'uncategorized';
      const existing = categoryMap.get(cat) || { current: 0, previous: 0, type: t.type };
      categoryMap.set(cat, { ...existing, current: existing.current + t.amount, type: t.type });
    });
    previousTxns.forEach(t => {
      const cat = t.category_id || 'uncategorized';
      const existing = categoryMap.get(cat) || { current: 0, previous: 0, type: t.type };
      categoryMap.set(cat, { ...existing, previous: existing.previous + t.amount, type: t.type });
    });

    const categoryInsights: CategoryInsight[] = Array.from(categoryMap.entries()).map(([catId, data]) => {
      const cat = categories.find(c => c.id === catId);
      const change = data.current - data.previous;
      const changePercent = data.previous > 0 ? ((change / data.previous) * 100) : (data.current > 0 ? 100 : 0);
      return {
        category: catId,
        categoryName: cat?.name || catId,
        currentAmount: data.current,
        previousAmount: data.previous,
        change,
        changePercent,
        type: data.type,
      };
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    // Smart recommendations
    const recommendations: { icon: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }[] = [];
    
    if (savingsRate < 10 && currentIncome > 0) {
      recommendations.push({ icon: '🚨', title: 'อัตราการออมต่ำมาก', description: `คุณออมได้เพียง ${savingsRate.toFixed(1)}% ของรายได้ ควรตั้งเป้าอย่างน้อย 20%`, priority: 'high' });
    } else if (savingsRate >= 30) {
      recommendations.push({ icon: '🌟', title: 'ออมเงินได้ดีมาก!', description: `อัตราการออม ${savingsRate.toFixed(1)}% — พิจารณานำเงินออมไปลงทุนเพิ่ม`, priority: 'low' });
    }

    if (projectedExpense > currentIncome * 1.1 && currentIncome > 0) {
      recommendations.push({ icon: '⚡', title: 'รายจ่ายคาดการณ์เกินรายรับ', description: `หากใช้จ่ายในอัตรานี้ต่อ จะใช้เงินรวม ฿${projectedExpense.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ซึ่งเกินรายรับ`, priority: 'high' });
    }

    if (recurringPercent > 70) {
      recommendations.push({ icon: '🔄', title: 'ค่าใช้จ่ายประจำสูงมาก', description: `${recurringPercent.toFixed(0)}% ของรายจ่ายเป็นค่าใช้จ่ายประจำ — ลองทบทวนสมัครสมาชิกที่ไม่จำเป็น`, priority: 'medium' });
    }

    const bigIncrease = categoryInsights.find(c => c.type === 'expense' && c.changePercent > 50 && c.currentAmount > 1000);
    if (bigIncrease) {
      recommendations.push({ icon: '📈', title: `${bigIncrease.categoryName} เพิ่มขึ้น ${bigIncrease.changePercent.toFixed(0)}%`, description: `จาก ฿${bigIncrease.previousAmount.toLocaleString()} เป็น ฿${bigIncrease.currentAmount.toLocaleString()} — ตรวจสอบว่ามีรายจ่ายที่ตัดได้หรือไม่`, priority: 'medium' });
    }

    if (dailyAvg > prevDailyAvg * 1.3 && prevDailyAvg > 0) {
      recommendations.push({ icon: '💸', title: 'การใช้จ่ายรายวันเพิ่มขึ้น', description: `เฉลี่ย ฿${dailyAvg.toFixed(0)}/วัน (เพิ่มจาก ฿${prevDailyAvg.toFixed(0)}/วัน)`, priority: 'medium' });
    }

    if (totalBudget === 0) {
      recommendations.push({ icon: '🎯', title: 'ยังไม่ได้ตั้งงบประมาณ', description: 'การตั้งงบประมาณช่วยให้ควบคุมค่าใช้จ่ายได้ดีขึ้น — ตั้งได้ในหน้าจัดการบัญชี', priority: 'low' });
    }

    return {
      currentIncome, previousIncome, currentExpense, previousExpense,
      incomeChange: currentIncome - previousIncome,
      incomeChangePercent: previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0,
      expenseChange: currentExpense - previousExpense,
      expenseChangePercent: previousExpense > 0 ? ((currentExpense - previousExpense) / previousExpense) * 100 : 0,
      savingsRate, prevSavingsRate, dailyAvg, prevDailyAvg,
      projectedExpense, budgetHealth, totalBudget,
      monthlyRecurring, recurringPercent,
      categoryInsights, recommendations,
      currentStart, currentEnd, previousStart, previousEnd,
    };
  }, [transactions, categories, accounts, recurringTransactions, comparisonPeriod]);

  const periodLabels: Record<ComparisonPeriod, { current: string; previous: string }> = {
    month: { current: format(insights.currentStart, "MMMM yyyy", { locale: th }), previous: format(insights.previousStart, "MMMM yyyy", { locale: th }) },
    quarter: { current: `ไตรมาส ${Math.floor(insights.currentStart.getMonth() / 3) + 1}/${insights.currentStart.getFullYear()}`, previous: `ไตรมาส ${Math.floor(insights.previousStart.getMonth() / 3) + 1}/${insights.previousStart.getFullYear()}` },
    year: { current: `ปี ${insights.currentStart.getFullYear()}`, previous: `ปี ${insights.previousStart.getFullYear()}` },
  };

  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n);
  
  const getChangeColor = (change: number, isExpense: boolean) => {
    if (change === 0) return "text-muted-foreground";
    return isExpense ? (change > 0 ? "text-red-500" : "text-green-500") : (change > 0 ? "text-green-500" : "text-red-500");
  };

  const getSavingsColor = (rate: number) => {
    if (rate >= 30) return 'text-green-600';
    if (rate >= 20) return 'text-blue-600';
    if (rate >= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="pb-20 px-4 pt-6 space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/summary">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">📊 วิเคราะห์การเปลี่ยนแปลง</h1>
          <p className="text-xs text-muted-foreground">เปรียบเทียบรายรับ-รายจ่าย พร้อมคำแนะนำอัจฉริยะ</p>
        </div>
      </div>

      {/* Period Selection */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">เปรียบเทียบ</span>
          <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">รายเดือน</SelectItem>
              <SelectItem value="quarter">รายไตรมาส</SelectItem>
              <SelectItem value="year">รายปี</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {periodLabels[comparisonPeriod].current} vs {periodLabels[comparisonPeriod].previous}
        </p>
      </Card>

      {/* Smart Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />คำแนะนำอัจฉริยะ
          </h3>
          <div className="space-y-2">
            {insights.recommendations.sort((a, b) => {
              const p = { high: 0, medium: 1, low: 2 };
              return p[a.priority] - p[b.priority];
            }).map((rec, i) => (
              <div key={i} className={cn(
                "p-3 rounded-lg text-sm flex gap-3",
                rec.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                rec.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
                'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              )}>
                <span className="text-lg shrink-0">{rec.icon}</span>
                <div>
                  <div className="font-medium text-foreground">{rec.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{rec.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">รายได้</span>
            <div className={cn("flex items-center gap-0.5 text-[10px]", getChangeColor(insights.incomeChange, false))}>
              {insights.incomeChange > 0 ? <TrendingUp className="h-3 w-3" /> : insights.incomeChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {insights.incomeChangePercent > 0 ? "+" : ""}{insights.incomeChangePercent.toFixed(1)}%
            </div>
          </div>
          <p className="text-base font-bold text-green-600">{fmt(insights.currentIncome)}</p>
          <p className="text-[10px] text-muted-foreground">ก่อนหน้า: {fmt(insights.previousIncome)}</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">ค่าใช้จ่าย</span>
            <div className={cn("flex items-center gap-0.5 text-[10px]", getChangeColor(insights.expenseChange, true))}>
              {insights.expenseChange > 0 ? <TrendingUp className="h-3 w-3" /> : insights.expenseChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {insights.expenseChangePercent > 0 ? "+" : ""}{insights.expenseChangePercent.toFixed(1)}%
            </div>
          </div>
          <p className="text-base font-bold text-red-600">{fmt(insights.currentExpense)}</p>
          <p className="text-[10px] text-muted-foreground">ก่อนหน้า: {fmt(insights.previousExpense)}</p>
        </Card>
      </div>

      {/* Financial Health Indicators */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />สุขภาพทางการเงิน
        </h3>
        <div className="space-y-4">
          {/* Savings Rate */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">อัตราการออม</span>
              <span className={cn("font-bold", getSavingsColor(insights.savingsRate))}>
                {insights.savingsRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.max(0, Math.min(insights.savingsRate, 100))} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>ก่อนหน้า: {insights.prevSavingsRate.toFixed(1)}%</span>
              <span>เป้าหมาย: 20%</span>
            </div>
          </div>

          {/* Daily Average */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">ค่าใช้จ่ายเฉลี่ย/วัน</span>
            <div className="text-right">
              <span className="font-bold">{fmt(insights.dailyAvg)}</span>
              {insights.prevDailyAvg > 0 && (
                <div className={cn("text-[10px]", getChangeColor(insights.dailyAvg - insights.prevDailyAvg, true))}>
                  {insights.dailyAvg > insights.prevDailyAvg ? '↑' : '↓'} จาก {fmt(insights.prevDailyAvg)}
                </div>
              )}
            </div>
          </div>

          {/* Projected Spending */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">คาดการณ์สิ้นเดือน</span>
            <div className="text-right">
              <span className={cn("font-bold", insights.projectedExpense > insights.currentIncome ? "text-red-600" : "text-foreground")}>
                {fmt(insights.projectedExpense)}
              </span>
              {insights.currentIncome > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  {((insights.projectedExpense / insights.currentIncome) * 100).toFixed(0)}% ของรายได้
                </div>
              )}
            </div>
          </div>

          {/* Recurring Burden */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">ค่าใช้จ่ายประจำ</span>
            <div className="text-right">
              <span className="font-bold">{fmt(insights.monthlyRecurring)}</span>
              <div className="text-[10px] text-muted-foreground">
                {insights.recurringPercent.toFixed(0)}% ของรายจ่าย
              </div>
            </div>
          </div>

          {/* Budget Health */}
          {insights.budgetHealth >= 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">งบประมาณคงเหลือ</span>
                <span className={cn("font-bold", insights.budgetHealth > 30 ? "text-green-600" : insights.budgetHealth > 10 ? "text-amber-600" : "text-red-600")}>
                  {insights.budgetHealth.toFixed(0)}%
                </span>
              </div>
              <Progress value={insights.budgetHealth} className="h-2" />
            </div>
          )}
        </div>
      </Card>

      {/* Category Insights */}
      <h2 className="text-sm font-semibold">การเปลี่ยนแปลงตามหมวดหมู่</h2>
      
      {insights.categoryInsights.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">ไม่มีข้อมูลธุรกรรม</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {insights.categoryInsights.slice(0, 10).map((insight) => {
            const cat = categories.find(c => c.id === insight.category);
            const isNew = insight.previousAmount === 0 && insight.currentAmount > 0;
            const isGone = insight.previousAmount > 0 && insight.currentAmount === 0;
            
            return (
              <Card key={insight.category} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {cat?.color && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                      <span className="font-medium text-sm truncate">{insight.categoryName}</span>
                      <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                        {insight.type === "income" ? "รายได้" : "รายจ่าย"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold">{fmt(insight.currentAmount)}</span>
                      {!isNew && <span className="text-[10px] text-muted-foreground">จาก {fmt(insight.previousAmount)}</span>}
                    </div>
                  </div>
                  
                  <div className={cn("flex flex-col items-end shrink-0", getChangeColor(insight.change, insight.type === "expense"))}>
                    {isNew ? (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] border-0">ใหม่</Badge>
                    ) : isGone ? (
                      <Badge variant="outline" className="text-[10px]">ไม่มี</Badge>
                    ) : (
                      <>
                        <div className="flex items-center gap-0.5 text-xs font-medium">
                          {insight.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {insight.changePercent > 0 ? "+" : ""}{insight.changePercent.toFixed(1)}%
                        </div>
                        <span className="text-[10px]">{insight.change > 0 ? "+" : ""}{fmt(insight.change)}</span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">สรุปภาพรวม</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">เพิ่มขึ้นมากที่สุด</span>
            <span className="font-medium text-red-500">
              {insights.categoryInsights.filter(i => i.type === "expense" && i.change > 0).sort((a, b) => b.changePercent - a.changePercent)[0]?.categoryName || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ลดลงมากที่สุด</span>
            <span className="font-medium text-green-500">
              {insights.categoryInsights.filter(i => i.type === "expense" && i.change < 0).sort((a, b) => a.changePercent - b.changePercent)[0]?.categoryName || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">หมวดหมู่ที่เพิ่มขึ้น</span>
            <span className="font-medium">{insights.categoryInsights.filter(i => i.type === "expense" && i.change > 0).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">หมวดหมู่ที่ลดลง</span>
            <span className="font-medium">{insights.categoryInsights.filter(i => i.type === "expense" && i.change < 0).length}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
