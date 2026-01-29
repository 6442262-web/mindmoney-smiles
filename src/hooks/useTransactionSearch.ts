import { useMemo } from 'react';
import { Transaction } from '@/hooks/useTransactions';

export interface SearchableTransaction {
  description: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string | null;
  usageCount: number;
  lastUsed: string;
}

export function useTransactionSearch(transactions: Transaction[]) {
  // Group transactions by description and count usage
  const groupedTransactions = useMemo(() => {
    const grouped = new Map<string, SearchableTransaction>();

    transactions.forEach((transaction) => {
      const key = transaction.description?.toLowerCase().trim() || '';
      if (!key) return;

      const existing = grouped.get(key);
      if (existing) {
        existing.usageCount += 1;
        // Keep the most recent amount and date
        if (transaction.date > existing.lastUsed) {
          existing.amount = transaction.amount;
          existing.lastUsed = transaction.date;
          existing.categoryId = transaction.category_id;
          existing.type = transaction.type as 'income' | 'expense';
        }
      } else {
        grouped.set(key, {
          description: transaction.description || '',
          type: transaction.type as 'income' | 'expense',
          amount: transaction.amount,
          categoryId: transaction.category_id,
          usageCount: 1,
          lastUsed: transaction.date,
        });
      }
    });

    // Sort by usage count (most used first)
    return Array.from(grouped.values()).sort((a, b) => b.usageCount - a.usageCount);
  }, [transactions]);

  // Search function
  const searchTransactions = (query: string): SearchableTransaction[] => {
    if (!query.trim()) {
      return groupedTransactions.slice(0, 10); // Return top 10 most used
    }

    const lowerQuery = query.toLowerCase().trim();
    return groupedTransactions.filter((transaction) => {
      const descMatch = transaction.description.toLowerCase().includes(lowerQuery);
      const amountMatch = transaction.amount.toString().includes(lowerQuery);
      return descMatch || amountMatch;
    });
  };

  return {
    groupedTransactions,
    searchTransactions,
    frequentlyUsed: groupedTransactions.slice(0, 5),
  };
}
