import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useLanguage } from "@/hooks/useLanguage";
import { Link } from "react-router-dom";
import { Target } from "lucide-react";

export function SavingsWidget() {
  const { goals } = useSavingsGoals();
  const { language } = useLanguage();
  const activeGoals = goals.filter(g => !g.is_completed).slice(0, 3);

  if (activeGoals.length === 0) return null;

  return (
    <Link to="/savings-goals">
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-primary" />
          {language === "th" ? "เป้าหมายการออม" : "Savings Goals"}
        </h3>
        <div className="space-y-3">
          {activeGoals.map(goal => {
            const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            return (
              <div key={goal.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{goal.icon} {goal.name}</span>
                  <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
