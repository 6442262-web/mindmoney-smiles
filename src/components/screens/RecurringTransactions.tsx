import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Trash2, Plus, History } from "lucide-react";
import { Link } from "react-router-dom";
import { RecurringTransaction, PriorityLevel } from "../MoneyMindApp";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import RecurringExecutionHistory from "./RecurringExecutionHistory";
import { getMonthlyAmount } from "@/lib/recurringUtils";

interface RecurringTransactionsProps {
  recurringTransactions: RecurringTransaction[];
  onUpdate: (id: string, updates: Partial<RecurringTransaction>) => void;
  onDelete: (id: string) => void;
}

export function RecurringTransactions({ 
  recurringTransactions, 
  onUpdate, 
  onDelete 
}: RecurringTransactionsProps) {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const priorityLabels: Record<PriorityLevel, string> = {
    1: t('priority.1.short'),
    2: t('priority.2.short'), 
    3: t('priority.3.short'),
    4: t('priority.4.short'),
    5: t('priority.5.short')
  };

  const frequencyLabels = {
    daily: t('frequency.daily'),
    weekly: t('frequency.weekly'),
    monthly: t('frequency.monthly')
  };

  const filteredTransactions = recurringTransactions.filter(transaction => 
    filterType === "all" || transaction.type === filterType
  );

  const toggleActive = (id: string, isActive: boolean) => {
    onUpdate(id, { isActive });
    toast({
      title: isActive ? t('recurring.enabled') : t('recurring.disabled'),
      description: t('recurring.changesSaved'),
    });
  };

  const handleDelete = (id: string, description: string) => {
    if (confirm(`${t('recurring.confirmDelete')} "${description}"`)) {
      onDelete(id);
      toast({
        title: t('recurring.deleted'),
        description: `"${description}" ${t('recurring.deletedDesc')}`,
      });
    }
  };


  const activeIncomeTotal = filteredTransactions
    .filter(t => t.type === "income" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);

  const activeExpenseTotal = filteredTransactions
    .filter(t => t.type === "expense" && t.isActive)
    .reduce((sum, t) => sum + getMonthlyAmount(t.amount, t.frequency), 0);

  const netMonthly = activeIncomeTotal - activeExpenseTotal;

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('recurring.title')}</h1>
        <div className="ml-auto">
          <Link to="/add">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t('recurring.add')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="p-4 mb-6">
        <h3 className="font-semibold mb-3">{t('recurring.summary')}</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">{t('transaction.income')}</p>
            <p className="text-lg font-bold text-income">
              ฿{activeIncomeTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('transaction.expense')}</p>
            <p className="text-lg font-bold text-expense">
              ฿{activeExpenseTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('recurring.remaining')}</p>
            <p className={`text-lg font-bold ${
              netMonthly >= 0 ? 'text-balance-positive' : 'text-balance-negative'
            }`}>
              ฿{netMonthly.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <Card className="p-4 mb-4">
        <Select value={filterType} onValueChange={(value) => setFilterType(value as "all" | "income" | "expense")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('recurring.allTypes')}</SelectItem>
            <SelectItem value="income">{t('recurring.incomeRecurring')}</SelectItem>
            <SelectItem value="expense">{t('recurring.expenseRecurring')}</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Recurring Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t('recurring.noItems')}</p>
            <Link to="/add">
              <Button className="mt-4">{t('recurring.addFirst')}</Button>
            </Link>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className={`p-4 ${!transaction.isActive ? 'opacity-60' : ''}`}>
              <div className="space-y-3">
                {/* Header with toggle */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{transaction.description}</h3>
                      <div className={`w-3 h-3 rounded-full bg-priority-${transaction.priority}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {transaction.category} • {frequencyLabels[transaction.frequency]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('priority.label')}: {priorityLabels[transaction.priority]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      transaction.type === "income" ? "text-income" : "text-expense"
                    }`}>
                      {transaction.type === "income" ? "+" : "-"}฿{transaction.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.type === "income" ? t('transaction.income') : t('transaction.expense')}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={transaction.isActive}
                      onCheckedChange={(checked) => toggleActive(transaction.id, checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {transaction.isActive ? t('recurring.active') : t('recurring.inactive')}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" title={t('recurring.history')}>
                          <History className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{t('recurring.history')}: {transaction.description}</DialogTitle>
                        </DialogHeader>
                        <RecurringExecutionHistory recurringTransactionId={transaction.id} />
                      </DialogContent>
                    </Dialog>
                    
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(transaction.id, transaction.description)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Next payment info */}
                <div className="text-xs text-muted-foreground">
                  {t('recurring.nextPayment')}: {new Date(transaction.nextDate).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Priority Legend */}
      {filteredTransactions.length > 0 && (
        <Card className="p-4 mt-6">
          <h3 className="font-semibold mb-3">{t('recurring.priorityLegend')}</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {Object.entries(priorityLabels).map(([level, label]) => (
              <div key={level} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-priority-${level}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
