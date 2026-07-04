import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, FileText, FileSpreadsheet, CalendarIcon, Filter, X, Palette, TrendingUp, Loader2, PiggyBank, Target, Wallet, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Transaction, RecurringTransaction } from "../MoneyMindApp";
import { useCategories } from "@/hooks/useCategories";
import { exportSummaryPdf } from "@/lib/exportPdf";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/dateUtils";
import { getMonthlyAmount } from "@/lib/recurringUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface SummaryProps {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

type PeriodType = "day" | "month" | "quarter" | "halfYear" | "year";

const periodLabels: Record<PeriodType, string> = {
  day: "วันนี้",
  month: "เดือนนี้",
  quarter: "ไตรมาสนี้", 
  halfYear: "6 เดือนล่าสุด",
  year: "ปีนี้"
};

export function Summary({ transactions, recurringTransactions }: SummaryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("month");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [chartColorScheme, setChartColorScheme] = useState<string>("default");
  const [exporting, setExporting] = useState(false);
  const { categories } = useCategories();
  const { toast } = useToast();

  const colorSchemes = {
    default: {
      label: "เริ่มต้น (เขียว/แดง)",
      income: "hsl(var(--chart-2))",
      expense: "hsl(var(--chart-1))",
    },
    redGreen: {
      label: "แดง/เขียว",
      income: "hsl(142, 76%, 36%)",
      expense: "hsl(0, 84%, 60%)",
    },
    blueOrange: {
      label: "น้ำเงิน/ส้ม",
      income: "hsl(217, 91%, 60%)",
      expense: "hsl(27, 98%, 54%)",
    },
    purpleYellow: {
      label: "ม่วง/เหลือง",
      income: "hsl(271, 76%, 53%)",
      expense: "hsl(48, 96%, 53%)",
    },
    tealPink: {
      label: "ฟ้าเขียว/ชมพู",
      income: "hsl(173, 80%, 40%)",
      expense: "hsl(330, 81%, 60%)",
    },
    indigoRose: {
      label: "คราม/กุหลาบ",
      income: "hsl(231, 48%, 48%)",
      expense: "hsl(351, 83%, 61%)",
    },
  };


  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedPeriod("month");
  };

  const filterTransactionsByPeriod = (transactions: Transaction[], period: PeriodType) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(transaction => {
      // parse เป็น local date — new Date("YYYY-MM-DD") ตีความเป็น UTC ทำให้วันเพี้ยนในเขตเวลาไทย
      const transactionDate = parseLocalDate(transaction.date);

      switch (period) {
        case "day":
          return transactionDate.toDateString() === now.toDateString();
        case "month":
          return transactionDate.getFullYear() === currentYear && 
                 transactionDate.getMonth() === currentMonth;
        case "quarter":
          const quarterStart = Math.floor(currentMonth / 3) * 3;
          return transactionDate.getFullYear() === currentYear &&
                 transactionDate.getMonth() >= quarterStart &&
                 transactionDate.getMonth() < quarterStart + 3;
        case "halfYear":
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return transactionDate >= sixMonthsAgo;
        case "year":
          return transactionDate.getFullYear() === currentYear;
        default:
          return true;
      }
    });
  };

  // Apply all filters
  let filteredTransactions = transactions;

  // Filter by period (if no custom date range)
  if (!startDate && !endDate) {
    filteredTransactions = filterTransactionsByPeriod(filteredTransactions, selectedPeriod);
  }

  // Filter by custom date range
  if (startDate || endDate) {
    const rangeStart = startDate ? startOfDay(startDate) : undefined;
    const rangeEnd = endDate ? endOfDay(endDate) : undefined;
    filteredTransactions = filteredTransactions.filter(transaction => {
      const transactionDate = parseLocalDate(transaction.date);
      if (rangeStart && transactionDate < rangeStart) return false;
      if (rangeEnd && transactionDate > rangeEnd) return false;
      return true;
    });
  }

  // Filter by categories
  if (selectedCategories.length > 0) {
    filteredTransactions = filteredTransactions.filter(transaction =>
      selectedCategories.includes(transaction.category)
    );
  }
  
  const totalIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpense;

  // Recurring transactions summary — แปลงเป็นยอดต่อเดือนตาม frequency ให้ตรงกับ Dashboard
  const monthlyRecurringIncome = recurringTransactions
    .filter(t => t.type === "income" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);

  const monthlyRecurringExpense = recurringTransactions
    .filter(t => t.type === "expense" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);

  // Category breakdown
  const expenseByCategory = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const topCategories = Object.entries(expenseByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // === Advanced Analytics ===
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;

  const transactionDays = new Set(filteredTransactions.map(t => t.date)).size;
  const avgDailyExpense = transactionDays > 0 
    ? filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / transactionDays 
    : 0;
  const avgDailyIncome = transactionDays > 0
    ? filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) / transactionDays
    : 0;

  // Top spending days
  const dailyExpenses: Record<string, number> = {};
  filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
    dailyExpenses[t.date] = (dailyExpenses[t.date] || 0) + t.amount;
  });
  const topSpendingDays = Object.entries(dailyExpenses)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  // Income by category
  const incomeByCategory = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
  const topIncomeCategories = Object.entries(incomeByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Transaction counts & stats
  const incomeCount = filteredTransactions.filter(t => t.type === 'income').length;
  const expenseCount = filteredTransactions.filter(t => t.type === 'expense').length;
  const avgTransactionAmount = filteredTransactions.length > 0
    ? filteredTransactions.reduce((s, t) => s + t.amount, 0) / filteredTransactions.length
    : 0;
  const maxExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((max, t) => Math.max(max, t.amount), 0);
  const maxIncome = filteredTransactions.filter(t => t.type === 'income').reduce((max, t) => Math.max(max, t.amount), 0);

  // Get transactions for selected date
  const getTransactionsForDate = (date: Date) => {
    return transactions.filter(t => isSameDay(parseLocalDate(t.date), date));
  };

  // Get daily totals for calendar
  const getDailyTotals = (date: Date) => {
    const dayTransactions = getTransactionsForDate(date);
    const income = dayTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, total: dayTransactions.length };
  };

  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : [];
  const selectedDateIncome = selectedDateTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const selectedDateExpense = selectedDateTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  // Chart data preparation
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (selectedPeriod === 'day') {
      // For day view, calculate from all transactions for today
      const todayTransactions = transactions.filter(t => {
        const tDate = parseLocalDate(t.date);
        return tDate.toDateString() === now.toDateString();
      });
      
      const dayIncome = todayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const dayExpense = todayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return [{
        name: 'วันนี้',
        รายรับ: dayIncome,
        รายจ่าย: dayExpense,
      }];
    } else if (selectedPeriod === 'month') {
      // Show daily data for current month - show all days
      const periodStart = startOfMonth(now);
      const periodEnd = endOfMonth(now);
      const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
      
      return days.map(day => {
        const dayTransactions = transactions.filter(t => 
          isSameDay(parseLocalDate(t.date), day)
        );
        
        const dayIncome = dayTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const dayExpense = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          name: format(day, 'd', { locale: th }),
          รายรับ: dayIncome,
          รายจ่าย: dayExpense,
        };
      });
    } else if (selectedPeriod === 'quarter') {
      // Show monthly data for current quarter
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      const monthsData = [];
      
      for (let i = quarterStart; i < quarterStart + 3; i++) {
        const monthDate = new Date(now.getFullYear(), i, 1);
        const monthTransactions = transactions.filter(t => {
          const tDate = parseLocalDate(t.date);
          return tDate.getFullYear() === now.getFullYear() && 
                 tDate.getMonth() === i;
        });

        const monthIncome = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const monthExpense = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        monthsData.push({
          name: format(monthDate, 'MMMM', { locale: th }),
          รายรับ: monthIncome,
          รายจ่าย: monthExpense,
        });
      }
      
      return monthsData;
    } else if (selectedPeriod === 'halfYear') {
      // Show monthly data for last 6 months
      const monthsData = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthTransactions = transactions.filter(t => {
          const tDate = parseLocalDate(t.date);
          return tDate.getFullYear() === monthDate.getFullYear() && 
                 tDate.getMonth() === monthDate.getMonth();
        });

        const monthIncome = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const monthExpense = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        monthsData.push({
          name: format(monthDate, 'MMM yy', { locale: th }),
          รายรับ: monthIncome,
          รายจ่าย: monthExpense,
        });
      }
      
      return monthsData;
    } else {
      // For year view, show monthly data for all 12 months
      const monthsData = [];
      
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(now.getFullYear(), i, 1);
        const monthTransactions = transactions.filter(t => {
          const tDate = parseLocalDate(t.date);
          return tDate.getFullYear() === now.getFullYear() && 
                 tDate.getMonth() === i;
        });

        const monthIncome = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const monthExpense = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        monthsData.push({
          name: format(monthDate, 'MMM', { locale: th }),
          รายรับ: monthIncome,
          รายจ่าย: monthExpense,
        });
      }

      return monthsData;
    }
  }, [transactions, selectedPeriod]);

  const currentColorScheme = colorSchemes[chartColorScheme as keyof typeof colorSchemes] || colorSchemes.default;
  
  const chartConfig = {
    รายรับ: {
      label: "รายรับ",
      color: currentColorScheme.income,
    },
    รายจ่าย: {
      label: "รายจ่าย",
      color: currentColorScheme.expense,
    },
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">สรุปรายงาน</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/expense-forecast">
            <Button variant="outline" size="sm">
              <span className="mr-1">🔮</span>
              คาดการณ์
            </Button>
          </Link>
          <Link to="/financial-insights">
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              วิเคราะห์
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Section */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ตัวกรอง</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'ซ่อน' : 'แสดง'}ตัวกรอง
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4 space-y-4">
            {/* Period Selection */}
            <div>
              <Label className="mb-2 block">ช่วงเวลา</Label>
              <Select 
                value={selectedPeriod} 
                onValueChange={(value) => {
                  setSelectedPeriod(value as PeriodType);
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">วันที่เริ่มต้น</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="mb-2 block">วันที่สิ้นสุด</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Label className="mb-2 block">หมวดหมู่</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.id}
                      checked={selectedCategories.includes(category.name)}
                      onCheckedChange={() => toggleCategory(category.name)}
                    />
                    <Label
                      htmlFor={category.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedCategories.length > 0 || startDate || endDate) && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  ใช้งาน: {selectedCategories.length} หมวดหมู่
                  {(startDate || endDate) && ", ช่วงวันที่กำหนดเอง"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  ล้างตัวกรอง
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Calendar Section */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ปฏิทินรายรับ-รายจ่าย</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {showCalendar ? 'ซ่อน' : 'แสดง'}ปฏิทิน
          </Button>
        </div>

        {showCalendar && (
          <Card className="p-4">
            <div className="flex justify-center mb-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="pointer-events-auto"
                modifiers={{
                  hasTransactions: (date) => getDailyTotals(date).total > 0
                }}
                modifiersStyles={{
                  hasTransactions: {
                    fontWeight: 'bold',
                    position: 'relative'
                  }
                }}
                components={{
                  DayContent: ({ date, ...props }) => {
                    const dailyTotals = getDailyTotals(date);
                    return (
                      <div className="relative w-full h-full flex flex-col items-center justify-center gap-0.5 py-1">
                        <span className="text-sm">{format(date, 'd')}</span>
                        {dailyTotals.total > 0 && (
                          <div className="flex flex-col items-center gap-0.5 w-full px-1">
                            {dailyTotals.income > 0 && (
                              <div className="flex items-center gap-0.5 text-[8px] font-medium text-income">
                                <div className="w-1 h-1 rounded-full bg-income"></div>
                                <span>{(dailyTotals.income / 1000).toFixed(0)}k</span>
                              </div>
                            )}
                            {dailyTotals.expense > 0 && (
                              <div className="flex items-center gap-0.5 text-[8px] font-medium text-expense">
                                <div className="w-1 h-1 rounded-full bg-expense"></div>
                                <span>{(dailyTotals.expense / 1000).toFixed(0)}k</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
              <div className="mt-4 pt-4 border-t">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">
                    {format(selectedDate, "EEEE", { locale: th })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, "d MMMM yyyy", { locale: th })}
                  </p>
                </div>
                
                {selectedDateTransactions.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-income-accent rounded-lg">
                        <p className="text-sm text-muted-foreground">รายรับ</p>
                        <p className="text-lg font-bold text-income">
                          ฿{selectedDateIncome.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-expense-accent rounded-lg">
                        <p className="text-sm text-muted-foreground">รายจ่าย</p>
                        <p className="text-lg font-bold text-expense">
                          ฿{selectedDateExpense.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        รายการทั้งหมด ({selectedDateTransactions.length})
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedDateTransactions.map((transaction) => (
                          <div 
                            key={transaction.id} 
                            className="flex justify-between items-start p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{transaction.description || transaction.category}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">{transaction.category}</p>
                                {transaction.time && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <p className="text-xs text-muted-foreground">{transaction.time} น.</p>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className={cn(
                              "font-semibold text-sm",
                              transaction.type === "income" ? "text-income" : "text-expense"
                            )}>
                              {transaction.type === "income" ? "+" : "-"}฿{transaction.amount.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    ไม่มีรายการในวันนี้
                  </p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Summary Info */}
      <Card className="p-3 mb-6 bg-muted/50">
        <div className="text-sm text-center">
          <span className="font-medium">
            {startDate && endDate 
              ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
              : periodLabels[selectedPeriod]
            }
          </span>
          {selectedCategories.length > 0 && (
            <span className="ml-2">
              • {selectedCategories.length} หมวดหมู่
            </span>
          )}
        </div>
      </Card>

      {/* Main Summary */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Card className="p-6 bg-gradient-primary text-white">
          <div className="text-center">
            <p className="text-sm opacity-90 mb-2">
              สรุป
              {selectedCategories.length > 0 && ` (${selectedCategories.length} หมวดหมู่)`}
            </p>
            <h2 className="text-3xl font-bold mb-4">
              ฿{balance.toLocaleString()}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs opacity-80">รายรับ</p>
                <p className="text-xl font-semibold">฿{totalIncome.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">รายจ่าย</p>
                <p className="text-xl font-semibold">฿{totalExpense.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recurring Summary */}
      <Card className="p-4 mb-6">
        <h3 className="font-semibold mb-3">รายการประจำรายเดือน</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-income-accent rounded-lg">
            <p className="text-sm text-muted-foreground">รายรับประจำ</p>
            <p className="text-lg font-bold text-income">
              ฿{monthlyRecurringIncome.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 bg-expense-accent rounded-lg">
            <p className="text-sm text-muted-foreground">รายจ่ายประจำ</p>
            <p className="text-lg font-bold text-expense">
              ฿{monthlyRecurringExpense.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-accent rounded-lg text-center">
          <p className="text-sm text-muted-foreground">เงินเหลือประจำเดือน</p>
          <p className={`text-lg font-bold ${
            (monthlyRecurringIncome - monthlyRecurringExpense) >= 0 ? 'text-balance-positive' : 'text-balance-negative'
          }`}>
            ฿{(monthlyRecurringIncome - monthlyRecurringExpense).toLocaleString()}
          </p>
        </div>
      </Card>

      {/* Category Breakdown */}
      {topCategories.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">หมวดหมู่รายจ่ายสูงสุด</h3>
          <div className="space-y-3">
            {topCategories.map(([category, amount]) => {
              const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category}</span>
                    <span className="text-sm text-muted-foreground">
                      ฿{amount.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Advanced Analytics */}
      {filteredTransactions.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            เครื่องมือวิเคราะห์
          </h3>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Savings Rate */}
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">อัตราออม</p>
              </div>
              <p className={`text-xl font-bold ${savingsRate >= 20 ? 'text-income' : savingsRate >= 0 ? 'text-foreground' : 'text-expense'}`}>
                {savingsRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {savingsRate >= 30 ? '🎉 ดีมาก!' : savingsRate >= 20 ? '👍 ดี' : savingsRate >= 0 ? '⚠️ ควรเพิ่ม' : '🔴 ใช้เกินรายรับ'}
              </p>
            </div>

            {/* Average Daily Expense */}
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-expense" />
                <p className="text-xs text-muted-foreground">จ่ายเฉลี่ย/วัน</p>
              </div>
              <p className="text-xl font-bold text-expense">
                ฿{Math.round(avgDailyExpense).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                รับเฉลี่ย ฿{Math.round(avgDailyIncome).toLocaleString()}/วัน
              </p>
            </div>

            {/* Max Single Transaction */}
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">รายจ่ายสูงสุด</p>
              </div>
              <p className="text-lg font-bold text-expense">
                ฿{maxExpense.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                รายรับสูงสุด ฿{maxIncome.toLocaleString()}
              </p>
            </div>

            {/* Transaction Count */}
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">จำนวนรายการ</p>
              </div>
              <p className="text-xl font-bold">{filteredTransactions.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                รับ {incomeCount} / จ่าย {expenseCount}
              </p>
            </div>
          </div>

          {/* Top Spending Days */}
          {topSpendingDays.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">📅 วันที่จ่ายมากที่สุด</h4>
              <div className="space-y-2">
                {topSpendingDays.map(([date, amount], i) => (
                  <div key={date} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <span className="text-sm">{new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <span className="text-sm font-semibold text-expense">-฿{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Income Categories */}
          {topIncomeCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">💰 แหล่งรายรับหลัก</h4>
              <div className="space-y-2">
                {topIncomeCategories.map(([category, amount]) => {
                  const pct = totalIncome > 0 ? (amount / totalIncome * 100) : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          ฿{amount.toLocaleString()} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full">
                        <div 
                          className="bg-income h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Export Options */}
      <Card className="p-4 mb-6">
        <h3 className="font-semibold mb-3">ส่งออกรายงาน</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-12" 
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const periodLabel = startDate || endDate
                  ? `${startDate ? format(startDate, 'dd/MM/yyyy') : '...'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : '...'}`
                  : periodLabels[selectedPeriod];
                await exportSummaryPdf({
                  title: 'รายงานสรุปการเงิน',
                  period: periodLabel,
                  totalIncome,
                  totalExpense,
                  balance,
                  savingsRate,
                  avgDailyExpense,
                  topExpenseCategories: topCategories.map(([name, amount]) => ({
                    name,
                    amount,
                    percentage: totalExpense > 0 ? (amount / totalExpense * 100) : 0,
                  })),
                  topIncomeCategories: topIncomeCategories.map(([name, amount]) => ({
                    name,
                    amount,
                    percentage: totalIncome > 0 ? (amount / totalIncome * 100) : 0,
                  })),
                  transactions: filteredTransactions.map(t => ({
                    date: parseLocalDate(t.date).toLocaleDateString('th-TH'),
                    description: t.description || '-',
                    category: t.category || '-',
                    type: t.type,
                    amount: t.amount,
                  })),
                });
                toast({ title: "ดาวน์โหลด PDF สำเร็จ" });
              } catch (e) {
                console.error(e);
                toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถสร้าง PDF ได้", variant: "destructive" });
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
            {exporting ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}
          </Button>
          <Button 
            variant="outline" 
            className="h-12"
            onClick={() => {
              try {
                const header = 'วันที่,รายละเอียด,หมวดหมู่,ประเภท,จำนวนเงิน\n';
                const rows = filteredTransactions.map(t => 
                  `${parseLocalDate(t.date).toLocaleDateString('th-TH')},"${(t.description || '-').replace(/"/g, '""')}","${(t.category || '-').replace(/"/g, '""')}",${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'},${t.type === 'income' ? '' : '-'}${t.amount}`
                ).join('\n');
                const bom = '\uFEFF';
                const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `moneymind-report-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast({ title: "ดาวน์โหลด CSV สำเร็จ" });
              } catch (e) {
                console.error(e);
                toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
              }
            }}
          >
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            ดาวน์โหลด CSV
          </Button>
        </div>
      </Card>

      {/* Income/Expense Chart */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">กราฟรายรับรายจ่าย</h2>
          <div className="flex items-center gap-2">
            <Popover open={showColorSettings} onOpenChange={setShowColorSettings}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  สีกราฟ
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">เลือกชุดสีกราฟ</h3>
                  <div className="space-y-2">
                    {Object.entries(colorSchemes).map(([key, scheme]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setChartColorScheme(key);
                          setShowColorSettings(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-accent",
                          chartColorScheme === key ? "border-primary bg-accent" : "border-border"
                        )}
                      >
                        <div className="flex gap-2">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                            style={{ backgroundColor: scheme.income }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                            style={{ backgroundColor: scheme.expense }}
                          />
                        </div>
                        <span className="text-sm font-medium">{scheme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowChart(!showChart)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showChart ? 'ซ่อน' : 'แสดง'}กราฟ
            </Button>
          </div>
        </div>

        {showChart && (
          <Card className="p-4">
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                      tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [`฿${value.toLocaleString()}`, '']}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Bar 
                      dataKey="รายรับ" 
                      fill={currentColorScheme.income} 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="รายจ่าย" 
                      fill={currentColorScheme.expense} 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>ไม่มีข้อมูลรายการในช่วงเวลานี้</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}