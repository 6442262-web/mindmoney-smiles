import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Target, Flame, PieChart as PieIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useLiabilities } from "@/hooks/useLiabilities";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { th } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
  CartesianGrid
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
  '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(amount);

export function FinancialAnalysis() {
  const [activeTab, setActiveTab] = useState("cashflow");
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { liabilities } = useLiabilities();
  const { recurringTransactions } = useRecurringTransactions();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ========== CASHFLOW FORECAST ==========
  const cashflowData = useMemo(() => {
    const data = [];
    // Past 3 months actual
    for (let i = 3; i >= 1; i--) {
      const m = subMonths(now, i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const monthTxns = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
      const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      data.push({
        name: format(m, 'MMM yy', { locale: th }),
        income, expense, net: income - expense, type: 'actual'
      });
    }
    // Current month
    const curTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const curIncome = curTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const curExpense = curTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    data.push({
      name: format(now, 'MMM yy', { locale: th }),
      income: curIncome, expense: curExpense, net: curIncome - curExpense, type: 'current'
    });

    // Forecast next 3 months from recurring
    const getMonthlyAmt = (amount: number, freq: string) => {
      if (freq === 'daily') return amount * 30;
      if (freq === 'weekly') return amount * 4;
      return amount;
    };
    const recIncome = recurringTransactions
      .filter(r => r.type === 'income' && r.is_active)
      .reduce((s, r) => s + getMonthlyAmt(r.amount, r.frequency), 0);
    const recExpense = recurringTransactions
      .filter(r => r.type === 'expense' && r.is_active)
      .reduce((s, r) => s + getMonthlyAmt(r.amount, r.frequency), 0);

    // Use avg of past 3 months + recurring as forecast
    const pastIncomes = data.filter(d => d.type === 'actual').map(d => d.income);
    const pastExpenses = data.filter(d => d.type === 'actual').map(d => d.expense);
    const avgIncome = pastIncomes.length > 0 ? pastIncomes.reduce((a, b) => a + b, 0) / pastIncomes.length : 0;
    const avgExpense = pastExpenses.length > 0 ? pastExpenses.reduce((a, b) => a + b, 0) / pastExpenses.length : 0;
    const forecastIncome = Math.max(recIncome, avgIncome);
    const forecastExpense = Math.max(recExpense, avgExpense);

    for (let i = 1; i <= 3; i++) {
      const m = new Date(currentYear, currentMonth + i, 1);
      data.push({
        name: format(m, 'MMM yy', { locale: th }),
        income: forecastIncome, expense: forecastExpense,
        net: forecastIncome - forecastExpense, type: 'forecast'
      });
    }
    return data;
  }, [transactions, recurringTransactions, currentMonth, currentYear]);

  // ========== BUDGET VS ACTUAL ==========
  const budgetData = useMemo(() => {
    const catMap = new Map<string, { name: string; color: string; budget: number; actual: number }>();
    // Use categories that have a meaningful name
    categories.forEach(c => {
      if (c.type === 'expense') {
        catMap.set(c.id, { name: c.name, color: c.color || '#6366f1', budget: 0, actual: 0 });
      }
    });
    // Budget from accounts
    const totalBudget = accounts.reduce((s, a) => s + (a.budget_limit || 0), 0);

    // Current month expenses by category
    const monthTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    });

    monthTxns.forEach(t => {
      if (t.category_id && catMap.has(t.category_id)) {
        const cat = catMap.get(t.category_id)!;
        cat.actual += t.amount;
      }
    });

    const totalActual = monthTxns.reduce((s, t) => s + t.amount, 0);

    return {
      categories: Array.from(catMap.values())
        .filter(c => c.actual > 0)
        .sort((a, b) => b.actual - a.actual)
        .slice(0, 10),
      totalBudget,
      totalActual,
      percentUsed: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
    };
  }, [transactions, categories, accounts, currentMonth, currentYear]);

  // ========== NET WORTH ==========
  const netWorthData = useMemo(() => {
    const totalAssets = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const totalLiabilities = liabilities
      .filter(l => l.is_active !== false)
      .reduce((s, l) => s + l.current_balance, 0);
    const netWorth = totalAssets - totalLiabilities;

    // Build monthly net worth trend (last 6 months from transactions)
    const trend = [];
    let runningBalance = 0;
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const monthTxns = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
      const monthIncome = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const monthExpense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      runningBalance += (monthIncome - monthExpense);
      trend.push({
        name: format(m, 'MMM', { locale: th }),
        assets: runningBalance > 0 ? runningBalance : 0,
        liabilities: totalLiabilities,
        netWorth: runningBalance - totalLiabilities,
      });
    }

    return { totalAssets, totalLiabilities, netWorth, trend };
  }, [transactions, accounts, liabilities]);

  // ========== SPENDING HEATMAP ==========
  const heatmapData = useMemo(() => {
    const start = startOfMonth(subMonths(now, 2));
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });

    const dayMap = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const key = t.date;
        dayMap.set(key, (dayMap.get(key) || 0) + t.amount);
      }
    });

    const maxSpending = Math.max(...Array.from(dayMap.values()), 1);

    // Group by weeks
    const weeks: { date: Date; amount: number; intensity: number }[][] = [];
    let currentWeek: { date: Date; amount: number; intensity: number }[] = [];

    days.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const amount = dayMap.get(key) || 0;
      const intensity = amount / maxSpending;
      
      if (getDay(day) === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({ date: day, amount, intensity });
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { weeks, maxSpending };
  }, [transactions]);

  // ========== PIE CHART ==========
  const pieData = useMemo(() => {
    const catTotals = new Map<string, { name: string; value: number; color: string }>();
    const monthTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    });

    monthTxns.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const catName = cat?.name || 'ไม่ระบุ';
      const catColor = cat?.color || '#94a3b8';
      const existing = catTotals.get(catName) || { name: catName, value: 0, color: catColor };
      existing.value += t.amount;
      catTotals.set(catName, existing);
    });

    return Array.from(catTotals.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, categories, currentMonth, currentYear]);

  const totalPie = pieData.reduce((s, d) => s + d.value, 0);

  const chartConfig = {
    income: { label: 'รายรับ', color: 'hsl(var(--chart-2))' },
    expense: { label: 'รายจ่าย', color: 'hsl(var(--chart-1))' },
    net: { label: 'คงเหลือ', color: 'hsl(var(--chart-3))' },
    assets: { label: 'สินทรัพย์', color: 'hsl(var(--chart-2))' },
    liabilities: { label: 'หนี้สิน', color: 'hsl(var(--chart-1))' },
    netWorth: { label: 'มูลค่าสุทธิ', color: 'hsl(var(--chart-3))' },
  };

  const getHeatColor = (intensity: number) => {
    if (intensity === 0) return 'bg-muted';
    if (intensity < 0.25) return 'bg-chart-2/30';
    if (intensity < 0.5) return 'bg-chart-1/30';
    if (intensity < 0.75) return 'bg-chart-1/60';
    return 'bg-chart-1/90';
  };

  return (
    <div className="pb-20 px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">📊 วิเคราะห์การเงิน</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="cashflow" className="text-xs px-1">
            <TrendingUp className="h-3 w-3 mr-1 hidden sm:inline" />คาดการณ์
          </TabsTrigger>
          <TabsTrigger value="budget" className="text-xs px-1">
            <Target className="h-3 w-3 mr-1 hidden sm:inline" />งบ
          </TabsTrigger>
          <TabsTrigger value="networth" className="text-xs px-1">
            <Wallet className="h-3 w-3 mr-1 hidden sm:inline" />มูลค่า
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="text-xs px-1">
            <Flame className="h-3 w-3 mr-1 hidden sm:inline" />Heatmap
          </TabsTrigger>
          <TabsTrigger value="pie" className="text-xs px-1">
            <PieIcon className="h-3 w-3 mr-1 hidden sm:inline" />หมวดหมู่
          </TabsTrigger>
        </TabsList>

        {/* CASHFLOW FORECAST */}
        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-1">🔮 พยากรณ์กระแสเงินสด</h3>
            <p className="text-xs text-muted-foreground mb-4">ข้อมูลจริง 3 เดือน + คาดการณ์ 3 เดือนข้างหน้า</p>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} className="fill-muted-foreground" />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'income' ? 'รายรับ' : name === 'expense' ? 'รายจ่าย' : 'คงเหลือ'
                    ]}
                  />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="expense" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="net" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          {/* Forecast Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            {cashflowData.filter(d => d.type === 'forecast').map((d, i) => (
              <Card key={i} className="p-3 border-dashed">
                <p className="text-xs text-muted-foreground mb-1">{d.name}</p>
                <p className={cn("text-sm font-bold", d.net >= 0 ? "text-income" : "text-expense")}>
                  {d.net >= 0 ? '+' : ''}{formatCurrency(d.net)}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* BUDGET VS ACTUAL */}
        <TabsContent value="budget" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-1">🎯 งบประมาณ vs ใช้จ่ายจริง</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {format(now, 'MMMM yyyy', { locale: th })}
            </p>

            {budgetData.totalBudget > 0 ? (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>ใช้ไป {formatCurrency(budgetData.totalActual)}</span>
                  <span>งบ {formatCurrency(budgetData.totalBudget)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      budgetData.percentUsed > 100 ? "bg-destructive" :
                      budgetData.percentUsed > 80 ? "bg-chart-5" : "bg-chart-2"
                    )}
                    style={{ width: `${Math.min(budgetData.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {budgetData.percentUsed.toFixed(0)}% ของงบ
                </p>
              </div>
            ) : (
              <Card className="p-4 mb-4 bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  💡 ตั้งงบประมาณในหน้าจัดการบัญชีเพื่อดูการเปรียบเทียบ
                </p>
              </Card>
            )}

            {/* Category breakdown bars */}
            <div className="space-y-3">
              {budgetData.categories.map((cat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="font-medium">{formatCurrency(cat.actual)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: cat.color,
                        width: `${Math.min((cat.actual / (budgetData.categories[0]?.actual || 1)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* NET WORTH TRACKER */}
        <TabsContent value="networth" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">สินทรัพย์</p>
              <p className="text-sm font-bold text-income">{formatCurrency(netWorthData.totalAssets)}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">หนี้สิน</p>
              <p className="text-sm font-bold text-expense">{formatCurrency(netWorthData.totalLiabilities)}</p>
            </Card>
            <Card className="p-3 text-center border-primary">
              <p className="text-xs text-muted-foreground">มูลค่าสุทธิ</p>
              <p className={cn("text-sm font-bold", netWorthData.netWorth >= 0 ? "text-income" : "text-expense")}>
                {formatCurrency(netWorthData.netWorth)}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-1">📈 แนวโน้มมูลค่าสุทธิ</h3>
            <p className="text-xs text-muted-foreground mb-4">ย้อนหลัง 6 เดือน (ประมาณการจากธุรกรรม)</p>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthData.trend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    chartConfig[name as keyof typeof chartConfig]?.label || name
                  ]} />
                  <Area type="monotone" dataKey="assets" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="netWorth" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          {/* Assets & Liabilities detail */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">🏦 รายละเอียด</h3>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">สินทรัพย์</p>
              {accounts.map(acc => (
                <div key={acc.id} className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {acc.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />}
                    {acc.name}
                  </span>
                  <span className="font-medium text-income">{formatCurrency(acc.balance || 0)}</span>
                </div>
              ))}
              {liabilities.filter(l => l.is_active !== false).length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">หนี้สิน</p>
                  {liabilities.filter(l => l.is_active !== false).map(l => (
                    <div key={l.id} className="flex justify-between text-sm">
                      <span>{l.name}</span>
                      <span className="font-medium text-expense">-{formatCurrency(l.current_balance)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* SPENDING HEATMAP */}
        <TabsContent value="heatmap" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-1">🔥 Spending Heatmap</h3>
            <p className="text-xs text-muted-foreground mb-4">ความเข้มแสดงระดับการใช้จ่ายในแต่ละวัน (3 เดือนล่าสุด)</p>

            {/* Day labels */}
            <div className="flex gap-1 mb-2">
              <div className="w-8 text-[10px] text-muted-foreground" />
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                <div key={d} className="flex-1 text-[10px] text-center text-muted-foreground">{d}</div>
              ))}
            </div>

            <div className="space-y-1 overflow-x-auto">
              {heatmapData.weeks.map((week, wi) => (
                <div key={wi} className="flex gap-1 items-center">
                  <div className="w-8 text-[9px] text-muted-foreground">
                    {wi === 0 || week[0]?.date.getDate() <= 7
                      ? format(week[0]?.date || now, 'MMM', { locale: th })
                      : ''}
                  </div>
                  {/* Pad start of first week */}
                  {wi === 0 && Array.from({ length: getDay(week[0]?.date || now) }).map((_, i) => (
                    <div key={`pad-${i}`} className="flex-1 aspect-square rounded-sm" />
                  ))}
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={cn(
                        "flex-1 aspect-square rounded-sm cursor-default transition-colors min-w-[12px]",
                        getHeatColor(day.intensity)
                      )}
                      title={`${format(day.date, 'd MMM', { locale: th })}: ${formatCurrency(day.amount)}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-3">
              <span className="text-[10px] text-muted-foreground mr-1">น้อย</span>
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm bg-chart-2/30" />
              <div className="w-3 h-3 rounded-sm bg-chart-1/30" />
              <div className="w-3 h-3 rounded-sm bg-chart-1/60" />
              <div className="w-3 h-3 rounded-sm bg-chart-1/90" />
              <span className="text-[10px] text-muted-foreground ml-1">มาก</span>
            </div>

            {/* Top spending days */}
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">🏆 วันที่ใช้จ่ายมากที่สุด</p>
              <div className="space-y-1">
                {heatmapData.weeks
                  .flat()
                  .filter(d => d.amount > 0)
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 5)
                  .map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{format(d.date, 'd MMMM', { locale: th })}</span>
                      <span className="font-medium text-expense">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* PIE CHART */}
        <TabsContent value="pie" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-1">🥧 สัดส่วนรายจ่ายตามหมวดหมู่</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {format(now, 'MMMM yyyy', { locale: th })}
            </p>

            {pieData.length > 0 ? (
              <>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div className="space-y-2 mt-4">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: d.color || COLORS[i % COLORS.length] }}
                        />
                        {d.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs">
                          {totalPie > 0 ? ((d.value / totalPie) * 100).toFixed(1) : 0}%
                        </span>
                        <span className="font-medium">{formatCurrency(d.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">ไม่มีข้อมูลรายจ่ายในเดือนนี้</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
