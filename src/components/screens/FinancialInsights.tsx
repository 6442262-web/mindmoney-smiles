import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ComparisonPeriod = "month" | "quarter" | "year";

interface CategoryInsight {
  category: string;
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
      case "quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
        break;
      case "year":
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }

    // Filter transactions by period
    const currentTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= currentStart && date <= currentEnd;
    });

    const previousTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= previousStart && date <= previousEnd;
    });

    // Calculate totals
    const currentIncome = currentTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const previousIncome = previousTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const currentExpense = currentTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const previousExpense = previousTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    // Calculate by category
    const categoryMap = new Map<string, { current: number; previous: number; type: string }>();

    currentTransactions.forEach(t => {
      const cat = t.category_id || 'uncategorized';
      const existing = categoryMap.get(cat) || { current: 0, previous: 0, type: t.type };
      categoryMap.set(cat, { ...existing, current: existing.current + t.amount, type: t.type });
    });

    previousTransactions.forEach(t => {
      const cat = t.category_id || 'uncategorized';
      const existing = categoryMap.get(cat) || { current: 0, previous: 0, type: t.type };
      categoryMap.set(cat, { ...existing, previous: existing.previous + t.amount, type: t.type });
    });

    const categoryInsights: CategoryInsight[] = Array.from(categoryMap.entries()).map(([category, data]) => {
      const change = data.current - data.previous;
      const changePercent = data.previous > 0 ? ((change / data.previous) * 100) : (data.current > 0 ? 100 : 0);
      return {
        category,
        currentAmount: data.current,
        previousAmount: data.previous,
        change,
        changePercent,
        type: data.type,
      };
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    return {
      currentIncome,
      previousIncome,
      incomeChange: currentIncome - previousIncome,
      incomeChangePercent: previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0,
      currentExpense,
      previousExpense,
      expenseChange: currentExpense - previousExpense,
      expenseChangePercent: previousExpense > 0 ? ((currentExpense - previousExpense) / previousExpense) * 100 : 0,
      categoryInsights,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    };
  }, [transactions, comparisonPeriod]);

  const periodLabels: Record<ComparisonPeriod, { current: string; previous: string }> = {
    month: {
      current: format(insights.currentStart, "MMMM yyyy", { locale: th }),
      previous: format(insights.previousStart, "MMMM yyyy", { locale: th }),
    },
    quarter: {
      current: `ไตรมาส ${Math.floor(insights.currentStart.getMonth() / 3) + 1}/${insights.currentStart.getFullYear()}`,
      previous: `ไตรมาส ${Math.floor(insights.previousStart.getMonth() / 3) + 1}/${insights.previousStart.getFullYear()}`,
    },
    year: {
      current: `ปี ${insights.currentStart.getFullYear()}`,
      previous: `ปี ${insights.previousStart.getFullYear()}`,
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getChangeColor = (change: number, isExpense: boolean) => {
    if (change === 0) return "text-muted-foreground";
    // For expenses, increase is bad (red), decrease is good (green)
    // For income, increase is good (green), decrease is bad (red)
    if (isExpense) {
      return change > 0 ? "text-red-500" : "text-green-500";
    }
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/summary">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">วิเคราะห์การเปลี่ยนแปลง</h1>
      </div>

      {/* Period Selection */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">เปรียบเทียบ</span>
          <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">รายเดือน</SelectItem>
              <SelectItem value="quarter">รายไตรมาส</SelectItem>
              <SelectItem value="year">รายปี</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {periodLabels[comparisonPeriod].current} เทียบกับ {periodLabels[comparisonPeriod].previous}
        </p>
      </Card>

      {/* Overall Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">รายได้</span>
            <div className={cn("flex items-center gap-1", getChangeColor(insights.incomeChange, false))}>
              {getChangeIcon(insights.incomeChange)}
              <span className="text-xs font-medium">
                {insights.incomeChangePercent > 0 ? "+" : ""}{insights.incomeChangePercent.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(insights.currentIncome)}</p>
          <p className="text-xs text-muted-foreground">
            ก่อนหน้า: {formatCurrency(insights.previousIncome)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">ค่าใช้จ่าย</span>
            <div className={cn("flex items-center gap-1", getChangeColor(insights.expenseChange, true))}>
              {getChangeIcon(insights.expenseChange)}
              <span className="text-xs font-medium">
                {insights.expenseChangePercent > 0 ? "+" : ""}{insights.expenseChangePercent.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-lg font-bold text-red-600">{formatCurrency(insights.currentExpense)}</p>
          <p className="text-xs text-muted-foreground">
            ก่อนหน้า: {formatCurrency(insights.previousExpense)}
          </p>
        </Card>
      </div>

      {/* Category Insights */}
      <h2 className="text-lg font-semibold mb-4">การเปลี่ยนแปลงตามหมวดหมู่</h2>
      
      {insights.categoryInsights.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">ไม่มีข้อมูลธุรกรรมในช่วงเวลาที่เลือก</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.categoryInsights.map((insight) => {
            const categoryData = categories.find(c => c.name === insight.category);
            const isNew = insight.previousAmount === 0 && insight.currentAmount > 0;
            const isGone = insight.previousAmount > 0 && insight.currentAmount === 0;
            
            return (
              <Card key={insight.category} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {categoryData?.color && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: categoryData.color }}
                        />
                      )}
                      <span className="font-medium">{insight.category}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        insight.type === "income" 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {insight.type === "income" ? "รายได้" : "รายจ่าย"}
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">{formatCurrency(insight.currentAmount)}</span>
                      {!isNew && (
                        <span className="text-xs text-muted-foreground">
                          จาก {formatCurrency(insight.previousAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex flex-col items-end",
                    getChangeColor(insight.change, insight.type === "expense")
                  )}>
                    {isNew ? (
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                        ใหม่
                      </span>
                    ) : isGone ? (
                      <span className="text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 px-2 py-1 rounded">
                        ไม่มีรายการ
                      </span>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          {insight.change > 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {insight.changePercent > 0 ? "+" : ""}{insight.changePercent.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-xs">
                          {insight.change > 0 ? "+" : ""}{formatCurrency(insight.change)}
                        </span>
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
      <Card className="p-4 mt-6">
        <h3 className="font-semibold mb-3">สรุปภาพรวม</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">หมวดหมู่ที่เพิ่มขึ้นมากที่สุด</span>
            <span className="font-medium text-red-500">
              {insights.categoryInsights
                .filter(i => i.type === "expense" && i.change > 0)
                .sort((a, b) => b.changePercent - a.changePercent)[0]?.category || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">หมวดหมู่ที่ลดลงมากที่สุด</span>
            <span className="font-medium text-green-500">
              {insights.categoryInsights
                .filter(i => i.type === "expense" && i.change < 0)
                .sort((a, b) => a.changePercent - b.changePercent)[0]?.category || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">จำนวนหมวดหมู่ที่เพิ่มขึ้น</span>
            <span className="font-medium">
              {insights.categoryInsights.filter(i => i.type === "expense" && i.change > 0).length} หมวดหมู่
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">จำนวนหมวดหมู่ที่ลดลง</span>
            <span className="font-medium">
              {insights.categoryInsights.filter(i => i.type === "expense" && i.change < 0).length} หมวดหมู่
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
