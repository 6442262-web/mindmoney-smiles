import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, Trash2, Pencil, Download, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { Transaction } from "../MoneyMindApp";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { exportTransactionsCsv } from "@/lib/exportCsv";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export function TransactionList({ transactions, onDelete, onUpdate }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { t, language } = useLanguage();

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: Partial<Transaction>) => {
    if (!onUpdate) return;
    await onUpdate(id, updates);
    toast.success(t('transaction.updateSuccess'));
  };

  const categories = Array.from(new Set(transactions.map(t => t.category).filter(c => c && c.trim() !== '')));

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || transaction.type === filterType;
    const matchesCategory = filterCategory === "all" || transaction.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  };

  const handleDeleteClick = (id: string) => {
    setSelectedTransactionId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTransactionId || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(selectedTransactionId);
      toast.success(t('transaction.deleteSuccess'));
      setDeleteDialogOpen(false);
      setSelectedTransactionId(null);
    } catch (error) {
      toast.error(t('transaction.deleteError'));
    } finally {
      setIsDeleting(false);
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
        <h1 className="text-2xl font-bold flex-1">{t('transaction.all')}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (filteredTransactions.length === 0) {
              toast.error(language === 'th' ? 'ไม่มีรายการให้ส่งออก' : 'No transactions to export');
              return;
            }
            exportTransactionsCsv(
              filteredTransactions.map(t => ({
                date: t.date,
                time: t.time,
                type: t.type,
                amount: t.amount,
                category: t.category,
                description: t.description || '',
              })),
              'transactions'
            );
            toast.success(language === 'th' ? 'ส่งออก CSV สำเร็จ' : 'CSV exported');
          }}
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('transaction.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select value={filterType} onValueChange={(value) => setFilterType(value as "all" | "income" | "expense")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transaction.allTypes')}</SelectItem>
              <SelectItem value="income">{t('transaction.income')}</SelectItem>
              <SelectItem value="expense">{t('transaction.expense')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transaction.allCategories')}</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t('transaction.noResults')}</p>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{transaction.description}</h3>
                    {transaction.priority && (
                      <div className={`w-3 h-3 rounded-full bg-priority-${transaction.priority}`} />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {transaction.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(transaction.date)}
                    {transaction.time && ` ${transaction.time} น.`}
                  </p>
                </div>
                <div className="flex items-start gap-2">
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
                  <div className="flex flex-col gap-1">
                    {onUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => handleEditClick(transaction)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      {filteredTransactions.length > 0 && (
        <Card className="p-4 mt-6">
          <h3 className="font-semibold mb-3">{t('transaction.displaySummary')}</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">{t('transaction.income')}</p>
              <p className="text-lg font-bold text-income">
                ฿{filteredTransactions
                  .filter(t => t.type === "income")
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('transaction.expense')}</p>
              <p className="text-lg font-bold text-expense">
                ฿{filteredTransactions
                  .filter(t => t.type === "expense")
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('transaction.balance')}</p>
              <p className="text-lg font-bold">
                ฿{(filteredTransactions
                  .filter(t => t.type === "income")
                  .reduce((sum, t) => sum + t.amount, 0) -
                  filteredTransactions
                  .filter(t => t.type === "expense")
                  .reduce((sum, t) => sum + t.amount, 0))
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transaction.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('transaction.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('transaction.deleting') : t('transaction.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
