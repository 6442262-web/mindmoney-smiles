import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { useTransactionSearch, SearchableTransaction } from '@/hooks/useTransactionSearch';
import { Transaction } from '@/hooks/useTransactions';

interface TransactionSearchProps {
  transactions: Transaction[];
  onSelect: (transaction: SearchableTransaction) => void;
}

export function TransactionSearch({ transactions, onSelect }: TransactionSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { t, language } = useLanguage();
  const { searchTransactions, frequentlyUsed } = useTransactionSearch(transactions);

  const results = query ? searchTransactions(query) : frequentlyUsed;

  const labels = {
    searchButton: language === 'th' ? 'ค้นหารายการเดิม' : 'Search previous entries',
    searchPlaceholder: language === 'th' ? 'ค้นหารายการที่เคยบันทึก...' : 'Search previous entries...',
    frequentlyUsed: language === 'th' ? 'รายการที่ใช้บ่อย' : 'Frequently used',
    searchResults: language === 'th' ? 'ผลการค้นหา' : 'Search results',
    noResults: language === 'th' ? 'ไม่พบรายการ' : 'No entries found',
    usedTimes: (count: number) => language === 'th' ? `ใช้ ${count} ครั้ง` : `Used ${count} times`,
    income: language === 'th' ? 'รายรับ' : 'Income',
    expense: language === 'th' ? 'รายจ่าย' : 'Expense',
  };

  const handleSelect = (transaction: SearchableTransaction) => {
    onSelect(transaction);
    setOpen(false);
    setQuery('');
  };

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        {labels.searchButton}
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={labels.searchPlaceholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{labels.noResults}</CommandEmpty>
          <CommandGroup heading={query ? labels.searchResults : labels.frequentlyUsed}>
            {results.map((transaction, index) => (
              <CommandItem
                key={`${transaction.description}-${index}`}
                value={transaction.description}
                onSelect={() => handleSelect(transaction)}
                className="flex items-center justify-between py-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {labels.usedTimes(transaction.usageCount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className="text-xs">
                    {transaction.type === 'income' ? labels.income : labels.expense}
                  </Badge>
                  <span className={`font-semibold whitespace-nowrap ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    ฿{formatAmount(transaction.amount)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
