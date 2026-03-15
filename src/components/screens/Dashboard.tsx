import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, DollarSign, Bell, Wallet, MessageCircle, Star, ArrowUpRight, ArrowDownRight, BarChart3, Target, LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { Transaction, RecurringTransaction } from "../MoneyMindApp";
import { AccountSelector } from "@/components/ui/AccountSelector";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { useCategories } from "@/hooks/useCategories";
import { useFavoriteTransactions } from "@/hooks/useFavoriteTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { SavingsWidget } from "@/components/widgets/SavingsWidget";
import { SmartAlerts } from "@/components/widgets/SmartAlerts";
import { SpendingBreakdown } from "@/components/widgets/SpendingBreakdown";
import { NetWorthWidget } from "@/components/widgets/NetWorthWidget";

interface DashboardProps {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

export function Dashboard({ transactions, recurringTransactions }: DashboardProps) {
  const { unreadCount } = useNotifications();
  const { t, language } = useLanguage();
  const { categories } = useCategories();
  const { favorites } = useFavoriteTransactions();
  const { currentAccount } = useAccounts();
  const dateLocale = language === 'th' ? th : enUS;

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);
  
  const getMonthlyAmount = (amount: number, frequency: string) => {
    switch (frequency) {
      case 'daily': return amount * 30;
      case 'weekly': return amount * 4;
      case 'monthly': return amount;
      default: return amount;
    }
  };
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyTotalIncome = monthlyTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyTotalExpense = monthlyTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyRecurringIncome = recurringTransactions
    .filter(t => t.type === "income" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);
  
  const monthlyRecurringExpenses = recurringTransactions
    .filter(t => t.type === "expense" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);

  const balance = totalIncome - totalExpense;
  const projectedBalance = monthlyRecurringIncome - monthlyRecurringExpenses;
  const availableThisMonth = balance - monthlyRecurringExpenses;

  // Previous month comparison
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthTransactions = transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });
  const prevMonthIncome = prevMonthTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevMonthExpense = prevMonthTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const incomeChange = prevMonthIncome > 0 ? ((monthlyTotalIncome - prevMonthIncome) / prevMonthIncome * 100) : 0;
  const expenseChange = prevMonthExpense > 0 ? ((monthlyTotalExpense - prevMonthExpense) / prevMonthExpense * 100) : 0;

  // Budget progress
  const budgetLimit = currentAccount?.budget_limit;
  const budgetProgress = budgetLimit ? Math.min(100, (monthlyTotalExpense / budgetLimit) * 100) : null;

  // Mini chart data (last 6 months)
  const miniChartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(currentYear, currentMonth - i, 1);
      const monthTxns = transactions.filter(t => {
        const d = parseLocalDate(t.date);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      });
      data.push({
        name: format(m, 'MMM', { locale: dateLocale }),
        income: monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return data;
  }, [transactions, currentMonth, currentYear]);

  const chartConfig = {
    income: { label: language === 'th' ? 'รายรับ' : 'Income', color: 'hsl(var(--chart-2))' },
    expense: { label: language === 'th' ? 'รายจ่าย' : 'Expense', color: 'hsl(var(--chart-1))' },
  };

  // Spending streak
  const streakDays = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dayExpenses = transactions.filter(t => {
        if (t.type !== "expense") return false;
        const d = parseLocalDate(t.date);
        return d.getDate() === checkDate.getDate() && d.getMonth() === checkDate.getMonth() && d.getFullYear() === checkDate.getFullYear();
      });
      const dailyAvg = monthlyTotalExpense / now.getDate();
      if (dayExpenses.reduce((s, t) => s + t.amount, 0) <= dailyAvg) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [transactions, monthlyTotalExpense]);

  return (
    <div className="pb-20 px-4 pt-6 space-y-5 animate-stagger">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/accounts">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('dashboard.accounts')}
          </Button>
        </Link>
        
        <Link to="/notifications" className="relative">
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-1">{t('app.name')}</h1>
        <p className="text-muted-foreground text-sm">{t('app.tagline')}</p>
      </div>

      {/* Account Selector */}
      <AccountSelector className="w-full" />

      {/* Available This Month */}
      <Card className="p-6 bg-gradient-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="text-center relative z-10">
          <p className="text-sm opacity-90 mb-1">
            {language === 'th' ? 'เงินที่ใช้ได้เดือนนี้' : 'Available This Month'}
          </p>
          <h2 className={`text-3xl font-bold ${availableThisMonth < 0 ? 'text-red-200' : ''}`}>
            ฿{availableThisMonth.toLocaleString()}
          </h2>
          {budgetProgress !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs opacity-80 mb-1">
                <span>{language === 'th' ? 'งบประมาณ' : 'Budget'}</span>
                <span>{budgetProgress.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${budgetProgress > 90 ? 'bg-red-300' : budgetProgress > 70 ? 'bg-yellow-300' : 'bg-white/80'}`}
                  style={{ width: `${budgetProgress}%` }}
                />
              </div>
            </div>
          )}
          {streakDays > 0 && (
            <div className="mt-2 text-xs opacity-80">
              🔥 {language === 'th' ? `ประหยัดติดต่อกัน ${streakDays} วัน` : `${streakDays}-day saving streak`}
            </div>
          )}
        </div>
      </Card>

      {/* Monthly Income & Expense with Comparison */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 hover:shadow-medium transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-income-accent rounded-lg">
              <TrendingUp className="h-5 w-5 text-income" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? 'รายรับเดือนนี้' : 'Income'}
              </p>
              <p className="text-lg font-bold text-income truncate">
                ฿{monthlyTotalIncome.toLocaleString()}
              </p>
              {prevMonthIncome > 0 && (
                <div className={`flex items-center gap-1 text-xs ${incomeChange >= 0 ? 'text-income' : 'text-expense'}`}>
                  {incomeChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(incomeChange).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-medium transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-expense-accent rounded-lg">
              <TrendingDown className="h-5 w-5 text-expense" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? 'รายจ่ายเดือนนี้' : 'Expense'}
              </p>
              <p className="text-lg font-bold text-expense truncate">
                ฿{monthlyTotalExpense.toLocaleString()}
              </p>
              {prevMonthExpense > 0 && (
                <div className={`flex items-center gap-1 text-xs ${expenseChange <= 0 ? 'text-income' : 'text-expense'}`}>
                  {expenseChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(expenseChange).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Smart Alerts Widget */}
      <SmartAlerts transactions={transactions} budgetLimit={currentAccount?.budget_limit ?? undefined} />

      {/* Spending Breakdown Donut */}
      <SpendingBreakdown transactions={transactions} />

      {/* Mini Trend Chart */}
      {miniChartData.some(d => d.income > 0 || d.expense > 0) && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">{language === 'th' ? '📊 เทรนด์ 6 เดือน' : '📊 6-Month Trend'}</h3>
          <ChartContainer config={chartConfig} className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => [`฿${value.toLocaleString()}`, '']} />
                <Bar dataKey="income" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      )}

      {/* Net Worth Overview */}
      <NetWorthWidget />

      {/* Savings Goals Widget */}
      <SavingsWidget />

      {/* Balance & Recurring */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('dashboard.currentBalance')}</p>
              <p className={`text-base font-bold truncate ${balance >= 0 ? 'text-balance-positive' : 'text-balance-negative'}`}>
                ฿{balance.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('dashboard.projectedBalance')}</p>
              <p className={`text-base font-bold truncate ${projectedBalance >= 0 ? 'text-balance-positive' : 'text-balance-negative'}`}>
                ฿{projectedBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-5 gap-2">
        <Link to="/add">
          <Button className="w-full h-16 text-xs bg-gradient-primary flex-col gap-1 shadow-soft hover:shadow-medium transition-shadow">
            <Plus className="h-5 w-5" />
            {t('dashboard.addNew')}
          </Button>
        </Link>
        <Link to="/chat-transaction">
          <Button variant="outline" className="w-full h-16 text-xs flex-col gap-1 border-primary/30 text-primary hover:bg-primary/10 transition-colors">
            <MessageCircle className="h-5 w-5" />
            {language === 'th' ? 'แชท' : 'Chat'}
          </Button>
        </Link>
        <Link to="/financial-analysis">
          <Button variant="outline" className="w-full h-16 text-xs flex-col gap-1 border-primary/30 text-primary hover:bg-primary/10 transition-colors">
            <BarChart3 className="h-5 w-5" />
            {language === 'th' ? 'วิเคราะห์' : 'Analysis'}
          </Button>
        </Link>
        <Link to="/savings-goals">
          <Button variant="outline" className="w-full h-16 text-xs flex-col gap-1 border-primary/30 text-primary hover:bg-primary/10 transition-colors">
            <Target className="h-5 w-5" />
            {language === 'th' ? 'ออม' : 'Save'}
          </Button>
        </Link>
        <Link to="/recurring">
          <Button variant="outline" className="w-full h-16 text-xs flex-col gap-1 hover:bg-accent transition-colors">
            {t('dashboard.recurring')}
          </Button>
        </Link>
      </div>

      {/* Quick Favorites */}
      {favorites.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-primary" />
            {language === 'th' ? 'รายการโปรด' : 'Favorites'}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {favorites.slice(0, 5).map(fav => (
              <Link key={fav.id} to="/add">
                <Button variant="outline" size="sm" className="whitespace-nowrap text-xs h-8 hover:bg-primary/10 transition-colors">
                  {fav.type === 'income' ? '💰' : '💸'} {fav.name} ฿{fav.amount.toLocaleString()}
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">{t('dashboard.recentTransactions')}</h3>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            {t('dashboard.noTransactions')}
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-start hover:bg-accent/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{transaction.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{categoryMap[transaction.category] || (language === 'th' ? 'ไม่ระบุ' : 'Uncategorized')}</p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseLocalDate(transaction.date), "d MMM", { locale: dateLocale })}
                    </p>
                  </div>
                </div>
                <p className={`font-bold text-sm whitespace-nowrap ml-2 ${
                  transaction.type === "income" ? "text-income" : "text-expense"
                }`}>
                  {transaction.type === "income" ? "+" : "-"}฿{transaction.amount.toLocaleString()}
                </p>
              </div>
            ))}
            {transactions.length > 5 && (
              <Link to="/transactions" className="block text-center">
                <Button variant="ghost" size="sm" className="text-primary">{t('dashboard.viewAll')}</Button>
              </Link>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
