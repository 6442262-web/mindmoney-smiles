import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save } from "lucide-react";
import { Transaction, TransactionType, PriorityLevel } from "../MoneyMindApp";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/dateUtils";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

const expenseCategories = [
  "อาหาร", "ค่าเดินทาง", "ช้อปปิ้ง", "บิล/ค่าใช้จ่าย", "สุขภาพ", 
  "บันเทิง", "การศึกษา", "ของใช้", "อื่นๆ"
];

const incomeCategories = [
  "เงินเดือน", "โบนัส", "ธุรกิจส่วนตัว", "การลงทุน", "ของขวัญ", "อื่นๆ"
];

export function EditTransactionDialog({ 
  transaction, 
  open, 
  onOpenChange, 
  onSave 
}: EditTransactionDialogProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(3);
  const [date, setDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const { t, language } = useLanguage();
  const dateLocale = language === 'th' ? th : enUS;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setCategory(transaction.category);
      setDescription(transaction.description || "");
      setPriority(transaction.priority || 3);
      setDate(parseLocalDate(transaction.date));
    }
  }, [transaction]);

  const categories = type === "expense" ? expenseCategories : incomeCategories;

  const priorityLabels: Record<PriorityLevel, string> = {
    1: t('priority.1'),
    2: t('priority.2'), 
    3: t('priority.3'),
    4: t('priority.4'),
    5: t('priority.5')
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!transaction || !amount || !category || isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (parsedAmount > 999999999) return;
    
    setSaving(true);
    try {
      await onSave(transaction.id, {
        type,
        amount: parsedAmount,
        category,
        description,
        priority,
        date: format(date, 'yyyy-MM-dd'),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('transaction.edit')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('transaction.type')}</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => {
                setType(value as TransactionType);
                setCategory("");
              }}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="income" id="edit-income" />
                <Label htmlFor="edit-income" className="text-income font-medium">
                  {t('transaction.income')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expense" id="edit-expense" />
                <Label htmlFor="edit-expense" className="text-expense font-medium">
                  {t('transaction.expense')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('transaction.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd MMM yyyy", { locale: dateLocale }) : <span>{t('transaction.selectDate')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="edit-amount" className="text-sm font-medium">
              {t('transaction.amount')}
            </Label>
            <Input
              id="edit-amount"
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
              className="text-lg"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('transaction.category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
          </div>

          {/* Priority Level */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('transaction.priority')}</Label>
            <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value) as PriorityLevel)}>
              <SelectTrigger>
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
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-sm font-medium">
              {t('transaction.description')}
            </Label>
            <Textarea
              id="edit-description"
              placeholder={t('transaction.description.placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full bg-gradient-primary"
            disabled={saving || !amount || !category}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('transaction.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}