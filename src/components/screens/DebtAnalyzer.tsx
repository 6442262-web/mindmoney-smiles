import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingDown, Flame, Snowflake, AlertTriangle, Trophy, Calendar, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiabilities } from "@/hooks/useLiabilities";

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });

interface DebtRow {
  id: string;
  name: string;
  type: string;
  balance: number;
  rate: number;
  monthlyPayment: number;
  monthlyInterest: number;
  yearlyInterest: number;
  payoffMonths: number | null;
  totalInterest: number | null;
  refinanceTargetRate: number | null;
  refinanceReason: string | null;
  potentialYearlySaving: number;
}

// Suggested "good" refinance rate by debt type (annual %)
const REFINANCE_TARGET: Record<string, number> = {
  credit_card: 12,
  personal_loan: 8,
  car_loan: 5,
  mortgage: 4,
  student_loan: 4,
  loan: 7,
  other: 8,
};

function getRefinanceSuggestion(type: string, rate: number, balance: number) {
  const key = (type || "loan").toLowerCase();
  const target = REFINANCE_TARGET[key] ?? REFINANCE_TARGET.loan;
  // Only suggest if current rate is meaningfully higher than target (>= 2% gap)
  if (rate <= 0 || rate - target < 2) {
    return { targetRate: null, reason: null, saving: 0 };
  }
  const saving = ((rate - target) / 100) * balance; // yearly interest saved
  let reason = `อัตราปัจจุบัน ${rate}% สูงกว่าค่าเฉลี่ยตลาด (~${target}%)`;
  if (key === "credit_card" && rate >= 16) reason = `บัตรเครดิตดอกเบี้ย ${rate}% — ควรรวมหนี้/สินเชื่อส่วนบุคคลแทน`;
  return { targetRate: target, reason, saving };
}

function computePayoff(balance: number, annualRate: number, monthlyPayment: number) {
  const r = annualRate / 100 / 12;
  if (monthlyPayment <= 0) return { months: null, totalInterest: null };
  const monthlyInterest = balance * r;
  if (monthlyPayment <= monthlyInterest) return { months: null, totalInterest: null };
  if (r === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    return { months, totalInterest: 0 };
  }
  const months = Math.ceil(
    Math.log(monthlyPayment / (monthlyPayment - balance * r)) / Math.log(1 + r)
  );
  const totalPaid = months * monthlyPayment;
  return { months, totalInterest: Math.max(0, totalPaid - balance) };
}

export function DebtAnalyzer() {
  const { liabilities, loading } = useLiabilities();
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");

  const rows: DebtRow[] = useMemo(() => {
    return liabilities
      .filter((l) => l.is_active !== false && l.current_balance > 0)
      .map((l) => {
        const rate = l.interest_rate || 0;
        const monthlyPayment = l.monthly_payment || 0;
        const monthlyInterest = (l.current_balance * rate) / 100 / 12;
        const { months, totalInterest } = computePayoff(
          l.current_balance,
          rate,
          monthlyPayment
        );
        const type = l.type || "loan";
        const refi = getRefinanceSuggestion(type, rate, l.current_balance);
        return {
          id: l.id,
          name: l.name,
          type,
          balance: l.current_balance,
          rate,
          monthlyPayment,
          monthlyInterest,
          yearlyInterest: monthlyInterest * 12,
          payoffMonths: months,
          totalInterest,
          refinanceTargetRate: refi.targetRate,
          refinanceReason: refi.reason,
          potentialYearlySaving: refi.saving,
        };
      });
  }, [liabilities]);

  const totals = useMemo(() => {
    const totalBalance = rows.reduce((s, r) => s + r.balance, 0);
    const totalMonthlyInterest = rows.reduce((s, r) => s + r.monthlyInterest, 0);
    const totalMonthlyPayment = rows.reduce((s, r) => s + r.monthlyPayment, 0);
    return { totalBalance, totalMonthlyInterest, totalMonthlyPayment };
  }, [rows]);

  const ranked = useMemo(() => {
    const sorted = [...rows];
    if (strategy === "avalanche") sorted.sort((a, b) => b.rate - a.rate);
    else sorted.sort((a, b) => a.balance - b.balance);
    return sorted;
  }, [rows, strategy]);

  const worst = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.monthlyInterest - a.monthlyInterest)[0];
  }, [rows]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link to="/business/liabilities">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">วิเคราะห์หนี้สิน</h1>
            <p className="text-xs text-muted-foreground">จัดอันดับดอกเบี้ย & แผนปลดหนี้</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <Card className="p-6 text-center text-muted-foreground">กำลังโหลด...</Card>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">ยังไม่มีหนี้สินที่ใช้งานอยู่</p>
            <p className="text-sm text-muted-foreground mt-1">
              เพิ่มหนี้สินในหน้าจัดการหนี้สินก่อน
            </p>
            <Link to="/business/liabilities">
              <Button className="mt-4">ไปที่หน้าหนี้สิน</Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">หนี้รวม</p>
                <p className="text-base font-bold text-destructive">{fmt(totals.totalBalance)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">ดอกเบี้ย/เดือน</p>
                <p className="text-base font-bold text-orange-500">
                  {fmt(totals.totalMonthlyInterest)}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">จ่าย/เดือน</p>
                <p className="text-base font-bold">{fmt(totals.totalMonthlyPayment)}</p>
              </Card>
            </div>

            {/* Worst offender */}
            {worst && (
              <Card className="p-4 border-destructive/30 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-destructive">
                      ดอกเบี้ยแพงที่สุดต่อเดือน
                    </p>
                    <p className="font-bold mt-1">{worst.name}</p>
                    <p className="text-sm text-muted-foreground">
                      เสียดอกเบี้ย {fmt(worst.monthlyInterest)} / เดือน
                      ({fmt(worst.yearlyInterest)} / ปี) ที่อัตรา {worst.rate}%
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Refinance suggestions */}
            {(() => {
              const refiList = rows.filter((r) => r.refinanceTargetRate != null);
              if (refiList.length === 0) return null;
              const totalSaving = refiList.reduce((s, r) => s + r.potentialYearlySaving, 0);
              return (
                <Card className="p-4 border-primary/30 bg-primary/5">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> แนะนำให้รีไฟแนนซ์ ({refiList.length} รายการ)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ประหยัดได้สูงสุด ~{fmt(totalSaving)} / ปี ถ้ารีไฟแนนซ์สำเร็จ
                      </p>
                      <div className="mt-3 space-y-2">
                        {refiList
                          .sort((a, b) => b.potentialYearlySaving - a.potentialYearlySaving)
                          .map((r) => (
                            <div
                              key={r.id}
                              className="rounded-md bg-background/60 border border-border p-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-sm truncate">{r.name}</p>
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  {r.rate}% → ~{r.refinanceTargetRate}%
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {r.refinanceReason}
                              </p>
                              <p className="text-xs mt-1">
                                ประหยัด ~
                                <span className="font-semibold text-primary">
                                  {fmt(r.potentialYearlySaving)}
                                </span>{" "}
                                / ปี
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Strategy tabs */}
            <Tabs value={strategy} onValueChange={(v) => setStrategy(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="avalanche" className="gap-2">
                  <Flame className="h-4 w-4" /> Avalanche
                </TabsTrigger>
                <TabsTrigger value="snowball" className="gap-2">
                  <Snowflake className="h-4 w-4" /> Snowball
                </TabsTrigger>
              </TabsList>
              <TabsContent value="avalanche" className="mt-2">
                <p className="text-xs text-muted-foreground px-1">
                  จ่ายตัวที่ดอกเบี้ย% สูงสุดก่อน — ประหยัดดอกเบี้ยที่สุด
                </p>
              </TabsContent>
              <TabsContent value="snowball" className="mt-2">
                <p className="text-xs text-muted-foreground px-1">
                  จ่ายตัวที่ยอดน้อยที่สุดก่อน — สร้างกำลังใจเร็ว
                </p>
              </TabsContent>
            </Tabs>

            {/* Ranked list */}
            <div className="space-y-3">
              {ranked.map((r, idx) => {
                const sharePct =
                  totals.totalBalance > 0 ? (r.balance / totals.totalBalance) * 100 : 0;
                const isTop = idx === 0;
                return (
                  <Card
                    key={r.id}
                    className={`p-4 ${isTop ? "border-primary/40 bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Badge variant={isTop ? "default" : "secondary"} className="shrink-0">
                          {isTop && <Trophy className="h-3 w-3 mr-1" />}#{idx + 1}
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            อัตรา {r.rate}% • ยอดคงเหลือ {fmt(r.balance)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">ดอก/เดือน</p>
                        <p className="font-bold text-orange-500">{fmt(r.monthlyInterest)}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>สัดส่วนของหนี้รวม</span>
                        <span>{sharePct.toFixed(1)}%</span>
                      </div>
                      <Progress value={sharePct} className="h-1.5" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-xs">
                      <div>
                        <p className="text-muted-foreground">จ่าย/เดือน</p>
                        <p className="font-semibold">{fmt(r.monthlyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> ปลดหนี้ใน
                        </p>
                        <p className="font-semibold">
                          {r.payoffMonths
                            ? `${r.payoffMonths} เดือน`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ดอกรวมจนจบ</p>
                        <p className="font-semibold text-destructive">
                          {r.totalInterest != null ? fmt(r.totalInterest) : "—"}
                        </p>
                      </div>
                    </div>

                    {r.monthlyPayment > 0 && r.payoffMonths === null && (
                      <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        จ่ายขั้นต่ำไม่พอ — ดอกเบี้ยโตเร็วกว่ายอดที่จ่าย
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Recommendation */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="font-semibold text-sm mb-2">💡 คำแนะนำ</p>
              <p className="text-sm text-muted-foreground">
                {strategy === "avalanche"
                  ? `เน้นจ่ายเงินส่วนเกินเข้า "${ranked[0]?.name}" ก่อน เพราะดอกเบี้ยสูงสุด ${ranked[0]?.rate}% — จะช่วยลดต้นทุนดอกเบี้ยได้มากที่สุด`
                  : `เริ่มเคลียร์ "${ranked[0]?.name}" ก่อน เพราะยอดน้อยที่สุด — เคลียร์ได้เร็วเพื่อสร้างกำลังใจ แล้วค่อยทยอยจ่ายตัวต่อไป`}
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
