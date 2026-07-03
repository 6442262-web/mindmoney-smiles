import { describe, it, expect } from 'vitest';
import { groupFrequentExpenses, getFrequentExpenses } from '@/hooks/useFrequentExpenses';
import { ExpenseGroup } from '@/hooks/useExpenseGroups';
import { Transaction } from '@/hooks/useTransactions';

let idCounter = 0;

function tx(description: string, amount: number, date = '2026-06-01'): Transaction {
  idCounter++;
  return {
    id: `tx-${idCounter}`,
    user_id: 'user-1',
    type: 'expense',
    amount,
    description,
    date,
    created_at: date,
    updated_at: date,
  };
}

function group(name: string, keywords?: string[]): ExpenseGroup {
  return { id: `grp-${name}`, name, keywords: keywords ?? [name] };
}

describe('groupFrequentExpenses', () => {
  it('จัดกลุ่มพื้นฐาน: รวมรายการที่มีคีย์เวิร์ดเป็นกลุ่มเดียว พร้อมช่วงราคาและจำนวนรวม', () => {
    const transactions = [
      tx('กาแฟ Amazon', 55), tx('กาแฟ Amazon', 55), tx('กาแฟ Amazon', 55),
      tx('กาแฟ Starbucks', 120), tx('กาแฟ Starbucks', 120),
    ];
    const result = groupFrequentExpenses(transactions, [group('กาแฟ')]);

    expect(result.groups).toHaveLength(1);
    const g = result.groups[0];
    expect(g.name).toBe('กาแฟ');
    expect(g.totalCount).toBe(5);
    expect(g.minAmount).toBe(55);
    expect(g.maxAmount).toBe(120);
    expect(g.variants).toHaveLength(2);
    expect(g.variants[0].description).toBe('กาแฟ Amazon'); // count มากกว่าขึ้นก่อน
    expect(result.ungrouped).toHaveLength(0);
  });

  it('variant ที่บันทึกครั้งเดียวยังอยู่ในกลุ่ม (แม้จะไม่ผ่านเกณฑ์ ungrouped)', () => {
    const transactions = [
      tx('กาแฟ Amazon', 55), tx('กาแฟ Amazon', 55),
      tx('กาแฟ Dean', 90),
    ];
    const result = groupFrequentExpenses(transactions, [group('กาแฟ')]);

    expect(result.groups[0].variants.map(v => v.description)).toContain('กาแฟ Dean');
    expect(result.groups[0].totalCount).toBe(3);
  });

  it('กลุ่มที่รวมได้ต่ำกว่า 2 ครั้งไม่แสดง และรายการที่ match แล้วไม่กลับไป ungrouped', () => {
    const transactions = [tx('กาแฟ Dean', 90)];
    const result = groupFrequentExpenses(transactions, [group('กาแฟ')]);

    expect(result.groups).toHaveLength(0);
    expect(result.ungrouped).toHaveLength(0);
  });

  it('กลุ่มที่คีย์เวิร์ดไม่ match อะไรเลยไม่อยู่ในผลลัพธ์และไม่ crash', () => {
    const transactions = [tx('ข้าวมันไก่', 50), tx('ข้าวมันไก่', 50)];
    const result = groupFrequentExpenses(transactions, [group('กาแฟ')]);

    expect(result.groups).toHaveLength(0);
    expect(result.ungrouped).toHaveLength(1);
  });

  it('รายการที่ match หลายกลุ่ม เข้ากลุ่มแรกตามลำดับเท่านั้น', () => {
    const transactions = [tx('กาแฟนม', 45), tx('กาแฟนม', 45)];
    const result = groupFrequentExpenses(transactions, [group('กาแฟ'), group('นม')]);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe('กาแฟ');
  });

  it('match แบบไม่สนตัวพิมพ์', () => {
    const transactions = [tx('Kafe AMAZON', 55), tx('Kafe AMAZON', 55)];
    const result = groupFrequentExpenses(transactions, [group('amazon')]);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].totalCount).toBe(2);
  });

  it('ไม่มีกลุ่ม → ungrouped เหมือน getFrequentExpenses เดิมทุกประการ (regression guard)', () => {
    const transactions = [
      tx('กาแฟ Amazon', 55), tx('กาแฟ Amazon', 55),
      tx('ข้าวมันไก่', 50), tx('ข้าวมันไก่', 50), tx('ข้าวมันไก่', 50),
      tx('ค่ารถ', 20), // ครั้งเดียว ไม่ผ่าน minCount
    ];
    const result = groupFrequentExpenses(transactions, []);

    expect(result.groups).toHaveLength(0);
    expect(result.ungrouped).toEqual(getFrequentExpenses(transactions, 6, 2));
  });

  it('minAmount เท่ากับ maxAmount เมื่อทุก variant ราคาเดียวกัน', () => {
    const transactions = [tx('กาแฟ A', 55), tx('กาแฟ B', 55)];
    const result = groupFrequentExpenses(transactions, [group('กาแฟ')]);

    expect(result.groups[0].minAmount).toBe(55);
    expect(result.groups[0].maxAmount).toBe(55);
  });

  it('คีย์เวิร์ดว่าง/ช่องว่างถูกข้าม เหมือนกลุ่มนั้นไม่มีคีย์เวิร์ด', () => {
    const transactions = [tx('กาแฟ A', 55), tx('กาแฟ A', 55)];
    const result = groupFrequentExpenses(transactions, [group('กาแฟ', ['  '])]);

    expect(result.groups).toHaveLength(0);
    expect(result.ungrouped).toHaveLength(1);
  });

  it('จำกัด variants ที่ 8 ตัว เก็บตัวที่ count สูงสุด', () => {
    const transactions: Transaction[] = [];
    for (let i = 1; i <= 9; i++) {
      // ร้านที่ i มี i รายการ เพื่อให้ count ต่างกัน
      for (let j = 0; j < i; j++) {
        transactions.push(tx(`กาแฟ ร้าน${i}`, 50 + i));
      }
    }
    const result = groupFrequentExpenses(transactions, [group('กาแฟ')]);

    expect(result.groups[0].variants).toHaveLength(8);
    // ร้าน1 (count 1 = ต่ำสุด) ต้องถูกตัดออก
    expect(result.groups[0].variants.map(v => v.description)).not.toContain('กาแฟ ร้าน1');
    // totalCount ยังนับจากทุก variant ก่อน cap
    expect(result.groups[0].totalCount).toBe(45);
  });
});
