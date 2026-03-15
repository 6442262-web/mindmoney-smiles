import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { useCategories } from "@/hooks/useCategories";
import { useMemo } from "react";
import { parseLocalDate } from "@/lib/dateUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SpendingBreakdownProps {
  transactions: { type: string; amount: number; date: string; category: string }[];
}

const COLORS = [
  "hsl(142, 70%, 45%)",
  "hsl(217, 85%, 60%)",
  "hsl(45, 90%, 50%)",
  "hsl(0, 75%, 55%)",
  "hsl(271, 70%, 55%)",
  "hsl(180, 60%, 45%)",
  "hsl(25, 90%, 55%)",
  "hsl(330, 70%, 55%)",
];

export function SpendingBreakdown({ transactions }: SpendingBreakdownProps) {
  const { language } = useLanguage();
  const { categories } = useCategories();

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = `${c.icon || ""} ${c.name}`.trim(); });
    return map;
  }, [categories]);

  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthExpenses = transactions.filter(t => {
      if (t.type !== "expense") return false;
      const d = parseLocalDate(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const byCategory: Record<string, number> = {};
    monthExpenses.forEach(t => {
      const name = categoryMap[t.category] || (language === "th" ? "อื่นๆ" : "Other");
      byCategory[name] = (byCategory[name] || 0) + t.amount;
    });

    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, categoryMap, language]);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 text-sm">
        🍩 {language === "th" ? "สัดส่วนรายจ่ายเดือนนี้" : "Spending Breakdown"}
      </h3>
      <div className="flex items-center gap-4">
        <div className="w-[120px] h-[120px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`฿${value.toLocaleString()}`, ""]}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.slice(0, 5).map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate flex-1 text-foreground">{item.name}</span>
              <span className="text-muted-foreground font-medium whitespace-nowrap">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          {data.length > 5 && (
            <p className="text-xs text-muted-foreground pl-4">
              +{data.length - 5} {language === "th" ? "อื่นๆ" : "more"}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
