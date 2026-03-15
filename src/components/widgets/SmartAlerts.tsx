import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { AlertTriangle, TrendingDown, PiggyBank, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { parseLocalDate } from "@/lib/dateUtils";

interface SmartAlertsProps {
  transactions: { type: string; amount: number; date: string }[];
  budgetLimit?: number;
}

export function SmartAlerts({ transactions, budgetLimit }: SmartAlertsProps) {
  const { language } = useLanguage();

  const alerts = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const result: { icon: React.ReactNode; text: string; severity: "warning" | "danger" | "info" | "success" }[] = [];

    const monthTxns = transactions.filter(t => {
      const d = parseLocalDate(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthIncome = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
    const projectedExpense = daysElapsed > 0 ? (monthExpense / daysElapsed) * daysInMonth : 0;

    // Budget overrun
    if (budgetLimit && monthExpense > budgetLimit) {
      result.push({
        icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
        text: language === "th" ? `⚠️ ใช้จ่ายเกินงบ ฿${(monthExpense - budgetLimit).toLocaleString()}` : `⚠️ Over budget by ฿${(monthExpense - budgetLimit).toLocaleString()}`,
        severity: "danger",
      });
    } else if (budgetLimit && projectedExpense > budgetLimit) {
      result.push({
        icon: <TrendingDown className="h-4 w-4 text-yellow-500" />,
        text: language === "th" ? `📈 คาดว่าสิ้นเดือนจะใช้ ฿${Math.round(projectedExpense).toLocaleString()} (เกินงบ)` : `📈 Projected ฿${Math.round(projectedExpense).toLocaleString()} (over budget)`,
        severity: "warning",
      });
    }

    // Low savings
    if (monthIncome > 0 && savingsRate < 20) {
      result.push({
        icon: <PiggyBank className="h-4 w-4 text-yellow-500" />,
        text: language === "th" ? `💡 อัตราการออม ${savingsRate.toFixed(0)}% (เป้าหมาย 20%)` : `💡 Savings rate ${savingsRate.toFixed(0)}% (target 20%)`,
        severity: savingsRate < 5 ? "danger" : "warning",
      });
    }

    // Spending spike (today vs average)
    const todayExpense = monthTxns.filter(t => {
      const d = parseLocalDate(t.date);
      return d.getDate() === now.getDate() && t.type === "expense";
    }).reduce((s, t) => s + t.amount, 0);
    const dailyAvg = daysElapsed > 1 ? monthExpense / daysElapsed : 0;
    if (todayExpense > dailyAvg * 2 && todayExpense > 100) {
      result.push({
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        text: language === "th" ? `🔥 วันนี้ใช้จ่าย ฿${todayExpense.toLocaleString()} (มากกว่าเฉลี่ย 2 เท่า)` : `🔥 Today ฿${todayExpense.toLocaleString()} (2x avg)`,
        severity: "warning",
      });
    }

    if (result.length === 0 && monthIncome > 0) {
      result.push({
        icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
        text: language === "th" ? "✅ สถานะการเงินดี ไม่มีเรื่องน่าเป็นห่วง" : "✅ Finances look good!",
        severity: "success",
      });
    }

    return result;
  }, [transactions, budgetLimit, language]);

  if (alerts.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
        🔔 {language === "th" ? "แจ้งเตือนอัจฉริยะ" : "Smart Alerts"}
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
            alert.severity === "danger" ? "bg-destructive/10 text-destructive" :
            alert.severity === "warning" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" :
            alert.severity === "success" ? "bg-primary/10 text-primary" : "bg-muted"
          }`}>
            {alert.icon}
            <span>{alert.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
