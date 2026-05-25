import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useLiabilities } from "@/hooks/useLiabilities";
import { useLanguage } from "@/hooks/useLanguage";
import { CreditCard, AlertTriangle, ChevronRight, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const REFINANCE_TARGET: Record<string, number> = {
  credit_card: 12, personal_loan: 8, car_loan: 5, mortgage: 4, loan: 7,
};

export function DebtWidget() {
  const { liabilities, loading } = useLiabilities();
  const { language } = useLanguage();

  if (loading) return null;
  const active = liabilities.filter(l => l.is_active !== false);
  if (active.length === 0) return null;

  const totalDebt = active.reduce((s, l) => s + Number(l.current_balance || 0), 0);
  const totalPrincipal = active.reduce((s, l) => s + Number(l.principal_amount || 0), 0);
  const monthlyPay = active.reduce((s, l) => s + Number(l.monthly_payment || 0), 0);
  const yearlyInterest = active.reduce((s, l) => s + (Number(l.current_balance || 0) * Number(l.interest_rate || 0) / 100), 0);
  const paidOff = totalPrincipal > 0 ? Math.max(0, Math.min(100, ((totalPrincipal - totalDebt) / totalPrincipal) * 100)) : 0;

  const highestRate = [...active].sort((a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0))[0];
  const refinanceCount = active.filter(l => {
    const target = REFINANCE_TARGET[l.type || 'loan'] ?? 7;
    return Number(l.interest_rate || 0) >= target + 2;
  }).length;

  return (
    <Link to="/debt-analyzer" className="block">
      <Card className="p-4 hover:shadow-medium transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-expense" />
            {language === 'th' ? 'หนี้สินของคุณ' : 'Your Debt'}
          </h3>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">{language === 'th' ? 'ยอดคงเหลือรวม' : 'Total Debt'}</p>
            <p className="text-lg font-bold text-expense">฿{totalDebt.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{language === 'th' ? 'จ่าย/เดือน' : 'Monthly'}</p>
            <p className="text-lg font-bold">฿{monthlyPay.toLocaleString()}</p>
          </div>
        </div>

        {totalPrincipal > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{language === 'th' ? 'จ่ายไปแล้ว' : 'Paid off'}</span>
              <span>{paidOff.toFixed(0)}%</span>
            </div>
            <Progress value={paidOff} className="h-1.5" />
          </div>
        )}

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" />
              {language === 'th' ? 'ดอกเบี้ยรวม/ปี' : 'Yearly interest'}
            </span>
            <span className="font-medium text-foreground">~฿{yearlyInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          {highestRate && Number(highestRate.interest_rate || 0) > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{language === 'th' ? 'ดอกแพงสุด' : 'Highest rate'}</span>
              <span className="font-medium text-foreground truncate ml-2">{highestRate.name} ({Number(highestRate.interest_rate).toFixed(1)}%)</span>
            </div>
          )}
          {refinanceCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 mt-2 p-2 bg-amber-500/10 rounded-md">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {language === 'th'
                  ? `มี ${refinanceCount} รายการควรพิจารณารีไฟแนนซ์`
                  : `${refinanceCount} debt${refinanceCount > 1 ? 's' : ''} should be refinanced`}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
