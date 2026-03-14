import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Camera, Receipt, CalendarIcon, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Transaction, RecurringTransaction, TransactionType, PriorityLevel } from "../MoneyMindApp";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getLocalDateString, getLocalTimeString } from "@/lib/dateUtils";
import { sanitizeText, getAmountError } from "@/lib/validation";
import { SlipScanner, SlipScanResult } from "../SlipScanner";
import { TransactionSearch } from "../TransactionSearch";
import { useTransactions } from "@/hooks/useTransactions";
import { SearchableTransaction } from "@/hooks/useTransactionSearch";

interface AddTransactionProps {
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  onAddRecurring: (transaction: Omit<RecurringTransaction, "id">) => void;
}

const expenseCategories = [
  "อาหาร", "ค่าเดินทาง", "ช้อปปิ้ง", "บิล/ค่าใช้จ่าย", "สุขภาพ", 
  "บันเทิง", "การศึกษา", "ของใช้", "อื่นๆ"
];

const incomeCategories = [
  "เงินเดือน", "โบนัส", "ธุรกิจส่วนตัว", "การลงทุน", "ของขวัญ", "อื่นๆ"
];

export function AddTransaction({ onAddTransaction, onAddRecurring }: AddTransactionProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(3);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showScanner, setShowScanner] = useState(false);
  const [transactionTime, setTransactionTime] = useState(getLocalTimeString());
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const dateLocale = language === 'th' ? th : enUS;
  const { transactions } = useTransactions();

  // Handle selection from transaction search
  const handleTransactionSelect = (selected: SearchableTransaction) => {
    setType(selected.type);
    setAmount(selected.amount.toString());
    setDescription(selected.description);
    // Category will need to be matched by name since we store category_id
    toast({
      title: language === 'th' ? 'นำเข้าข้อมูลสำเร็จ' : 'Data imported',
      description: language === 'th' ? 'ข้อมูลจากรายการเดิมถูกกรอกในฟอร์มแล้ว' : 'Previous entry data has been filled in the form',
    });
  };

  const categories = type === "expense" ? expenseCategories : incomeCategories;

  const handleScanComplete = (result: SlipScanResult) => {
    // Auto-fill form with scanned data
    if (result.amount) {
      setAmount(result.amount.toString());
    }
    if (result.transactionType) {
      setType(result.transactionType);
    }
    if (result.suggestedCategory) {
      // Try to match with existing categories
      const matchedCategory = categories.find(
        cat => cat.toLowerCase().includes(result.suggestedCategory?.toLowerCase() || "")
      );
      if (matchedCategory) {
        setCategory(matchedCategory);
      }
    }
    if (result.recipient || result.description) {
      setDescription([result.recipient, result.description].filter(Boolean).join(" - "));
    }
    
    toast({
      title: "นำเข้าข้อมูลสำเร็จ",
      description: "ข้อมูลจากสลิปถูกกรอกในฟอร์มแล้ว",
    });
  };

  // Quick save directly from scan result
  const handleQuickSave = async (result: SlipScanResult) => {
    if (!result.amount) {
      throw new Error("ไม่พบจำนวนเงิน");
    }

    const transactionType = result.transactionType || "expense";
    const categoryList = transactionType === "expense" ? expenseCategories : incomeCategories;
    
    // Find matching category or use default
    let matchedCategory = "อื่นๆ";
    if (result.suggestedCategory) {
      const found = categoryList.find(
        cat => cat.toLowerCase().includes(result.suggestedCategory?.toLowerCase() || "")
      );
      if (found) {
        matchedCategory = found;
      }
    }

    const description = [result.recipient, result.description].filter(Boolean).join(" - ") || "สแกนจากสลิป";

    await onAddTransaction({
      type: transactionType,
      amount: result.amount,
      category: matchedCategory,
      description,
      date: result.date || getLocalDateString(),
      time: getLocalTimeString(),
      priority: 3,
    });
  };

  const priorityLabels: Record<PriorityLevel, string> = {
    1: t('priority.1'),
    2: t('priority.2'), 
    3: t('priority.3'),
    4: t('priority.4'),
    5: t('priority.5')
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    const amountError = getAmountError(amount);
    if (amountError || !category) {
      toast({
        title: t('transaction.validation.required'),
        description: amountError || t('transaction.validation.check'),
        variant: "destructive",
      });
      return;
    }

    const sanitizedDesc = sanitizeText(description);
    if (sanitizedDesc.length > 500) {
      toast({
        title: language === 'th' ? 'รายละเอียดยาวเกินไป' : 'Description too long',
        description: language === 'th' ? 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร' : 'Description must not exceed 500 characters',
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
    const baseData = {
      type,
      amount: parseFloat(amount),
      category,
      description: sanitizedDesc,
      priority,
    };

    if (isRecurring) {
      onAddRecurring({
        ...baseData,
        frequency,
        nextDate: getLocalDateString(startDate),
        isActive: true,
      });
      toast({
        title: t('transaction.addRecurringSuccess'),
        description: `${description} ${t('transaction.willStart')} ${format(startDate, 'dd MMM yyyy', { locale: dateLocale })}`,
      });
    } else {
      onAddTransaction({
        ...baseData,
        date: getLocalDateString(),
        time: transactionTime,
      });
      toast({
        title: t('transaction.addSuccess'),
        description: `${description} ${t('transaction.savedSuccessfully')}`,
      });
    }

    // Reset form
    setAmount("");
    setCategory("");
    setDescription("");
    setPriority(3);
    setIsRecurring(false);
    setStartDate(new Date());
    setTransactionTime(getLocalTimeString());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('transaction.add')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Search Previous Transactions */}
        <TransactionSearch
          transactions={transactions}
          onSelect={handleTransactionSelect}
        />

        {/* Transaction Type */}
        <Card className="p-4">
          <Label className="text-base font-semibold">{t('transaction.type')}</Label>
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as TransactionType)}
            className="flex gap-6 mt-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="income" id="income" />
              <Label htmlFor="income" className="text-income font-medium">
                {t('transaction.income')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="expense" id="expense" />
              <Label htmlFor="expense" className="text-expense font-medium">
                {t('transaction.expense')}
              </Label>
            </div>
          </RadioGroup>
        </Card>

        {/* Recurring Option */}
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="recurring" className="text-base font-medium">
              {t('transaction.recurring')}
            </Label>
          </div>
          
          {isRecurring && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('transaction.frequency')}</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value as "monthly" | "weekly" | "daily")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('frequency.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('frequency.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('frequency.monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('transaction.startDate')}</Label>
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
                      {startDate ? format(startDate, "dd MMM yyyy", { locale: dateLocale }) : <span>{t('transaction.selectDate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </Card>

        {/* Amount */}
        <Card className="p-4">
          <Label htmlFor="amount" className="text-base font-semibold">
            {t('transaction.amount')}
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            min="0"
            max="999999999"
            step="0.01"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || (Number(val) >= 0 && Number(val) <= 999999999)) {
                setAmount(val);
              }
            }}
            className="mt-2 text-lg"
          />
        </Card>

        {/* Time */}
        <Card className="p-4">
          <Label htmlFor="time" className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {language === 'th' ? 'เวลา' : 'Time'}
            </div>
          </Label>
          <Input
            id="time"
            type="time"
            value={transactionTime}
            onChange={(e) => setTransactionTime(e.target.value)}
            className="mt-2"
          />
        </Card>

        {/* Category */}
        <Card className="p-4">
          <Label className="text-base font-semibold">{t('transaction.category')}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={t('category.select')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Priority Level */}
        <Card className="p-4">
          <Label className="text-base font-semibold">{t('transaction.priority')}</Label>
          <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value) as PriorityLevel)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityLabels).map(([level, label]) => (
                <SelectItem key={level} value={level}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-priority-${level}`} />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Description */}
        <Card className="p-4">
          <Label htmlFor="description" className="text-base font-semibold">
            {t('transaction.description')}
          </Label>
          <Textarea
            id="description"
            placeholder={t('transaction.description.placeholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2"
          />
        </Card>

        {/* Scan Options */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            type="button" 
            variant="outline" 
            className="h-12"
            onClick={() => setShowScanner(true)}
          >
            <Camera className="mr-2 h-5 w-5" />
            {t('transaction.scanSlip')}
          </Button>
          <Button type="button" variant="outline" className="h-12">
            <Receipt className="mr-2 h-5 w-5" />
            {t('transaction.attachSlip')}
          </Button>
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full h-12 text-lg bg-gradient-primary">
          {t('transaction.save')}
        </Button>
      </form>

      {/* Slip Scanner Dialog */}
      <SlipScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScanComplete={handleScanComplete}
        onQuickSave={handleQuickSave}
      />
    </div>
  );
}
