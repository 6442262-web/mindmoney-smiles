import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft, Plus, Target, Trash2, PiggyBank, CalendarDays, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { format, differenceInDays, parseISO } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { RequiredMark } from "@/components/ui/required-mark";
import { useToast } from "@/hooks/use-toast";

const GOAL_ICONS = ["🎯", "🏠", "🚗", "✈️", "💻", "📱", "💍", "🎓", "🏥", "🎮"];
const GOAL_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(217, 91%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 87%, 65%)",
  "hsl(0, 84%, 60%)",
];

export function SavingsGoals() {
  const { goals, loading, createGoal, addAmount, deleteGoal } = useSavingsGoals();
  const { language } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [showDeposit, setShowDeposit] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🎯");
  const [depositAmount, setDepositAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dateLocale = language === "th" ? th : enUS;
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
      toast({
        title: language === "th" ? "กรอกข้อมูลไม่ครบ" : "Missing information",
        description: language === "th" ? "กรุณากรอกชื่อเป้าหมายและจำนวนเงินที่มากกว่า 0" : "Please enter a goal name and an amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    await createGoal({
      name: name.trim(),
      target_amount: parseFloat(targetAmount),
      icon: selectedIcon,
      deadline: deadline || null,
    });
    setName("");
    setTargetAmount("");
    setDeadline("");
    setSelectedIcon("🎯");
    setShowCreate(false);
    setSubmitting(false);
  };

  const handleDeposit = async () => {
    if (!showDeposit || !depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: language === "th" ? "จำนวนเงินไม่ถูกต้อง" : "Invalid amount",
        description: language === "th" ? "กรุณากรอกจำนวนเงินที่มากกว่า 0" : "Please enter an amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    await addAmount(showDeposit, parseFloat(depositAmount));
    setDepositAmount("");
    setShowDeposit(null);
    setSubmitting(false);
  };

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  return (
    <div className="pb-20 px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{language === "th" ? "🎯 เป้าหมายการออม" : "🎯 Savings Goals"}</h1>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" /> {language === "th" ? "เพิ่ม" : "Add"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === "th" ? "สร้างเป้าหมายใหม่" : "Create New Goal"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{language === "th" ? "ไอคอน" : "Icon"}</label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_ICONS.map(icon => (
                    <button key={icon} onClick={() => setSelectedIcon(icon)}
                      className={`text-2xl p-2 rounded-lg border-2 transition-all ${selectedIcon === icon ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="goal-name" className="text-sm font-medium mb-1 block">
                  {language === "th" ? "ชื่อเป้าหมาย" : "Goal name"}<RequiredMark />
                </label>
                <Input id="goal-name" placeholder={language === "th" ? "เช่น เที่ยวญี่ปุ่น, ซื้อโน้ตบุ๊ก" : "e.g. Japan trip, new laptop"} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="goal-target" className="text-sm font-medium mb-1 block">
                  {language === "th" ? "จำนวนเงินเป้าหมาย (บาท)" : "Target amount"}<RequiredMark />
                </label>
                <Input id="goal-target" type="number" placeholder="0" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} min="1" />
              </div>
              <div>
                <label htmlFor="goal-deadline" className="text-sm font-medium mb-1 block">
                  {language === "th" ? "วันที่ต้องการบรรลุ (ไม่บังคับ)" : "Target date (optional)"}
                </label>
                <Input id="goal-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  {language === "th" ? "ถ้าระบุ ระบบจะคำนวณยอดที่ต้องออมต่อวันให้" : "If set, we'll show how much to save per day"}
                </p>
              </div>
              <Button onClick={handleCreate} disabled={submitting || !name.trim() || !targetAmount} className="w-full bg-gradient-primary">
                {submitting ? (language === "th" ? "กำลังสร้าง..." : "Creating...") : (language === "th" ? "สร้างเป้าหมาย" : "Create Goal")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <Card className="p-5 bg-gradient-primary text-white">
        <div className="flex items-center gap-3 mb-3">
          <PiggyBank className="h-8 w-8" />
          <div>
            <p className="text-sm opacity-90">{language === "th" ? "ออมรวมทั้งหมด" : "Total Saved"}</p>
            <p className="text-2xl font-bold">฿{totalSaved.toLocaleString()}</p>
          </div>
        </div>
        {totalTarget > 0 && (
          <div>
            <div className="flex justify-between text-sm opacity-80 mb-1">
              <span>{language === "th" ? "ความคืบหน้ารวม" : "Overall Progress"}</span>
              <span>{Math.min(100, (totalSaved / totalTarget * 100)).toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(100, totalSaved / totalTarget * 100)} className="h-2 bg-white/20" />
          </div>
        )}
      </Card>

      {/* Active Goals */}
      {activeGoals.length === 0 && completedGoals.length === 0 && !loading && (
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{language === "th" ? "ยังไม่มีเป้าหมาย\nกดปุ่ม + เพื่อเริ่มต้น" : "No goals yet\nTap + to get started"}</p>
        </div>
      )}

      {activeGoals.map(goal => {
        const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
        const remaining = goal.target_amount - goal.current_amount;
        const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null;
        const dailySavingsNeeded = daysLeft && daysLeft > 0 ? remaining / daysLeft : null;

        return (
          <Card key={goal.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{goal.icon || "🎯"}</span>
                <div>
                  <h3 className="font-bold text-lg">{goal.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    ฿{goal.current_amount.toLocaleString()} / ฿{goal.target_amount.toLocaleString()}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteGoal(goal.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Progress value={progress} className="h-3" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
              <span className="text-muted-foreground">
                {language === "th" ? `เหลือ ฿${remaining.toLocaleString()}` : `฿${remaining.toLocaleString()} left`}
              </span>
            </div>

            {/* Smart insights */}
            <div className="flex flex-wrap gap-2">
              {daysLeft !== null && (
                <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                  <CalendarDays className="h-3 w-3" />
                  {daysLeft > 0
                    ? (language === "th" ? `อีก ${daysLeft} วัน` : `${daysLeft} days left`)
                    : (language === "th" ? "เลยกำหนด" : "Overdue")}
                </div>
              )}
              {dailySavingsNeeded && dailySavingsNeeded > 0 && (
                <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  {language === "th" ? `ออมวันละ ฿${Math.ceil(dailySavingsNeeded).toLocaleString()}` : `Save ฿${Math.ceil(dailySavingsNeeded).toLocaleString()}/day`}
                </div>
              )}
            </div>

            {/* Deposit button */}
            <Dialog open={showDeposit === goal.id} onOpenChange={(open) => setShowDeposit(open ? goal.id : null)}>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-primary" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> {language === "th" ? "เพิ่มเงินออม" : "Add Savings"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{goal.icon} {goal.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="deposit-amount" className="text-sm font-medium mb-1 block">
                      {language === "th" ? "จำนวนเงินที่ฝากเพิ่ม (บาท)" : "Deposit amount"}<RequiredMark />
                    </label>
                    <Input id="deposit-amount" type="number" placeholder="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min="1" />
                  </div>
                  <Button onClick={handleDeposit} disabled={submitting || !depositAmount} className="w-full bg-gradient-primary">
                    {submitting ? "..." : (language === "th" ? "บันทึก" : "Save")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        );
      })}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <h2 className="font-bold text-lg mt-6">{language === "th" ? "🏆 สำเร็จแล้ว" : "🏆 Completed"}</h2>
          {completedGoals.map(goal => (
            <Card key={goal.id} className="p-4 opacity-80 border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{goal.icon}</span>
                  <div>
                    <h3 className="font-bold line-through">{goal.name}</h3>
                    <p className="text-sm text-primary font-medium">฿{goal.target_amount.toLocaleString()} ✅</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteGoal(goal.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
