import { useMemo } from 'react';
import { Transaction } from '@/hooks/useTransactions';
import { ExpenseGroup } from '@/hooks/useExpenseGroups';

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

export interface GroupedFrequentExpenses {
  id: string;
  name: string;
  totalCount: number;
  minAmount: number;
  maxAmount: number;
  variants: FrequentExpense[];
}

export interface GroupedFrequentResult {
  groups: GroupedFrequentExpenses[];
  ungrouped: FrequentExpense[];
}

const MAX_VARIANTS_PER_GROUP = 8;
const GROUP_MIN_TOTAL_COUNT = 2;

// จัดกลุ่มรายการใช้บ่อยตามกลุ่มที่ผู้ใช้นิยามเอง (match แบบ contains กับ description)
// รายการที่ match กลุ่มใดกลุ่มหนึ่งแล้วจะไม่โผล่ใน ungrouped ซ้ำ; ถ้า match หลายกลุ่ม กลุ่มแรกตามลำดับชนะ
export function groupFrequentExpenses(
  transactions: Transaction[],
  groupDefs: ExpenseGroup[],
  ungroupedLimit = 6,
): GroupedFrequentResult {
  // minCount=1 เพื่อให้ร้านที่ไปครั้งเดียวยังเป็นตัวเลือกย่อยในกลุ่มได้
  const all = getFrequentExpenses(transactions, Infinity, 1);

  const matchers = groupDefs
    .map(g => ({
      def: g,
      keywordsLower: g.keywords.map(k => k.trim().toLowerCase()).filter(Boolean),
      variants: [] as FrequentExpense[],
    }))
    .filter(m => m.keywordsLower.length > 0);

  const ungroupedCandidates: FrequentExpense[] = [];

  for (const fe of all) {
    const descLower = fe.description.toLowerCase();
    const matched = matchers.find(m => m.keywordsLower.some(k => descLower.includes(k)));
    if (matched) {
      matched.variants.push(fe);
    } else {
      ungroupedCandidates.push(fe);
    }
  }

  const groups: GroupedFrequentExpenses[] = matchers
    .filter(m => m.variants.length > 0)
    .map(m => {
      const totalCount = m.variants.reduce((sum, v) => sum + v.count, 0);
      const amounts = m.variants.map(v => v.typicalAmount);
      return {
        id: m.def.id,
        name: m.def.name,
        totalCount,
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts),
        variants: m.variants.slice(0, MAX_VARIANTS_PER_GROUP),
      };
    })
    .filter(g => g.totalCount >= GROUP_MIN_TOTAL_COUNT);

  const ungrouped = ungroupedCandidates
    .filter(fe => fe.count >= 2)
    .slice(0, ungroupedLimit);

  return { groups, ungrouped };
}

export function useGroupedFrequentExpenses(
  transactions: Transaction[],
  groupDefs: ExpenseGroup[],
  ungroupedLimit = 6,
) {
  return useMemo(
    () => groupFrequentExpenses(transactions, groupDefs, ungroupedLimit),
    [transactions, groupDefs, ungroupedLimit],
  );
}
