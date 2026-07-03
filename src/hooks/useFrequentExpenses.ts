import { useMemo } from 'react';
import { Transaction } from '@/hooks/useTransactions';

export interface FrequentExpense {
  description: string;
  count: number;
  typicalAmount: number;
  lastUsed: string;
}

// วิเคราะห์รายการรายจ่ายที่ผู้ใช้บันทึกซ้ำบ่อย จาก description ที่เหมือนกัน
export function getFrequentExpenses(
  transactions: Transaction[],
  limit = 6,
  minCount = 2,
): FrequentExpense[] {
  const groups = new Map<string, {
    description: string;
    count: number;
    amounts: Map<number, number>;
    lastUsed: string;
  }>();

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const desc = (t.description || '').trim();
    if (!desc) continue;

    const key = desc.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = { description: desc, count: 0, amounts: new Map(), lastUsed: t.date };
      groups.set(key, group);
    }
    group.count++;
    group.amounts.set(t.amount, (group.amounts.get(t.amount) || 0) + 1);
    if (t.date > group.lastUsed) group.lastUsed = t.date;
  }

  return [...groups.values()]
    .filter(g => g.count >= minCount)
    .sort((a, b) => b.count - a.count || b.lastUsed.localeCompare(a.lastUsed))
    .slice(0, limit)
    .map(g => {
      // ใช้จำนวนเงินที่บันทึกบ่อยที่สุดของรายการนั้นเป็นค่าเริ่มต้น
      let typicalAmount = 0;
      let bestCount = 0;
      for (const [amount, count] of g.amounts) {
        if (count > bestCount) {
          bestCount = count;
          typicalAmount = amount;
        }
      }
      return {
        description: g.description,
        count: g.count,
        typicalAmount,
        lastUsed: g.lastUsed,
      };
    });
}

export function useFrequentExpenses(transactions: Transaction[], limit = 6) {
  return useMemo(() => getFrequentExpenses(transactions, limit), [transactions, limit]);
}
