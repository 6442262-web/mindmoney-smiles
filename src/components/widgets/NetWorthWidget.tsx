import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { useAccounts } from "@/hooks/useAccounts";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useLiabilities } from "@/hooks/useLiabilities";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

export function NetWorthWidget() {
  const { language } = useLanguage();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { goals, loading: goalsLoading } = useSavingsGoals();
  const { liabilities, loading: liabilitiesLoading } = useLiabilities();

  const stats = useMemo(() => {
    const totalAccounts = accounts
      .filter(a => a.is_active)
      .reduce((s, a) => s + (a.balance || 0), 0);
    const totalSavings = goals.reduce((s, g) => s + g.current_amount, 0);
    const totalLiabilities = liabilities
      .filter(l => l.is_active)
      .reduce((s, l) => s + l.current_balance, 0);
    const netWorth = totalAccounts + totalSavings - totalLiabilities;
    return { totalAccounts, totalSavings, totalLiabilities, netWorth };
  }, [accounts, goals, liabilities]);

  // ซ่อนวิดเจ็ตจนกว่าจะมีข้อมูลจริง — ผู้ใช้ใหม่ไม่ควรเห็นการ์ดทรัพย์สิน ฿0 ก่อนเริ่มใช้ฟีเจอร์
  if (accountsLoading || goalsLoading || liabilitiesLoading) return null;
  if (stats.totalAccounts === 0 && stats.totalSavings === 0 && stats.totalLiabilities === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 text-sm">
        💎 {language === "th" ? "ภาพรวมทรัพย์สิน" : "Net Worth"}
      </h3>
      
      <div className="text-center mb-3">
        <p className="text-2xl font-bold" style={{ color: stats.netWorth >= 0 ? 'hsl(var(--balance-positive))' : 'hsl(var(--balance-negative))' }}>
          ฿{stats.netWorth.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {language === "th" ? "มูลค่าสุทธิ" : "Total Net Worth"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link to="/accounts" className="text-center p-2 rounded-lg bg-income-accent hover:bg-income-light transition-colors">
          <Wallet className="h-4 w-4 mx-auto mb-1 text-income" />
          <p className="text-xs font-bold text-income">฿{stats.totalAccounts.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{language === "th" ? "บัญชี" : "Accounts"}</p>
        </Link>
        <Link to="/savings-goals" className="text-center p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
          <PiggyBank className="h-4 w-4 mx-auto mb-1 text-primary" />
          <p className="text-xs font-bold text-primary">฿{stats.totalSavings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{language === "th" ? "เงินออม" : "Savings"}</p>
        </Link>
        <Link to="/business/liabilities" className="text-center p-2 rounded-lg bg-expense-accent hover:bg-expense-light transition-colors">
          <CreditCard className="h-4 w-4 mx-auto mb-1 text-expense" />
          <p className="text-xs font-bold text-expense">฿{stats.totalLiabilities.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{language === "th" ? "หนี้สิน" : "Debts"}</p>
        </Link>
      </div>
    </Card>
  );
}
