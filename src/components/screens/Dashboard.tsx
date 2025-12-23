import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, DollarSign, Bell, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Transaction, RecurringTransaction } from "../MoneyMindApp";
import { AccountSelector } from "@/components/ui/AccountSelector";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";

interface DashboardProps {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

export function Dashboard({ transactions, recurringTransactions }: DashboardProps) {
  const { unreadCount } = useNotifications();
  const { t, language } = useLanguage();
  const dateLocale = language === 'th' ? th : enUS;
  
  // Calculate monthly amount based on frequency
  const getMonthlyAmount = (amount: number, frequency: string) => {
    switch (frequency) {
      case 'daily':
        return amount * 30;
      case 'weekly':
        return amount * 4;
      case 'monthly':
        return amount;
      default:
        return amount;
    }
  };
  
  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyIncome = recurringTransactions
    .filter(t => t.type === "income" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);
  
  const monthlyExpenses = recurringTransactions
    .filter(t => t.type === "expense" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);

  const balance = totalIncome - totalExpense;
  const projectedBalance = monthlyIncome - monthlyExpenses;

  return (
    <div className="pb-20 px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-primary mb-2">{t('app.name')}</h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </div>

      {/* Account Selector */}
      <div className="mb-4">
        <AccountSelector className="w-full" />
      </div>

      {/* Balance Overview */}
      <Card className="p-6 bg-gradient-primary text-white">
        <div className="text-center">
          <p className="text-sm opacity-90 mb-2">{t('dashboard.currentBalance')}</p>
          <h2 className="text-3xl font-bold mb-4">
            ฿{balance.toLocaleString()}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs opacity-80">{t('dashboard.income')}</p>
              <p className="text-lg font-semibold">฿{totalIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">{t('dashboard.expense')}</p>
              <p className="text-lg font-semibold">฿{totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recurring Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-income-accent rounded-lg">
              <TrendingUp className="h-5 w-5 text-income" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.recurringIncome')}</p>
              <p className="text-lg font-bold text-income">
                ฿{monthlyIncome.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-expense-accent rounded-lg">
              <TrendingDown className="h-5 w-5 text-expense" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.recurringExpense')}</p>
              <p className="text-lg font-bold text-expense">
                ฿{monthlyExpenses.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Projected Balance */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{t('dashboard.projectedBalance')}</p>
            <p className={`text-lg font-bold ${projectedBalance >= 0 ? 'text-balance-positive' : 'text-balance-negative'}`}>
              ฿{projectedBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/add">
          <Button className="w-full h-16 text-base bg-gradient-primary">
            <Plus className="mr-2 h-5 w-5" />
            {t('dashboard.addNew')}
          </Button>
        </Link>
        <Link to="/recurring">
          <Button variant="outline" className="w-full h-16 text-base">
            {t('dashboard.recurring')}
          </Button>
        </Link>
      </div>

      {/* Recent Transactions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">{t('dashboard.recentTransactions')}</h3>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {t('dashboard.noTransactions')}
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 3).map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">{transaction.category}</p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "d MMM", { locale: dateLocale })} {format(new Date(transaction.date), "HH:mm")} {language === 'th' ? 'น.' : ''}
                    </p>
                  </div>
                </div>
                <p className={`font-bold ${
                  transaction.type === "income" ? "text-income" : "text-expense"
                }`}>
                  {transaction.type === "income" ? "+" : "-"}฿{transaction.amount.toLocaleString()}
                </p>
              </div>
            ))}
            {transactions.length > 3 && (
              <Link to="/transactions" className="block text-center">
                <Button variant="ghost" size="sm">{t('dashboard.viewAll')}</Button>
              </Link>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
