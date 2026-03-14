import { describe, it, expect, vi } from "vitest";

// Test the CSV generation logic without DOM dependencies
function generateCsvContent(transactions: Array<{
  date: string;
  time?: string | null;
  type: string;
  amount: number;
  category: string;
  description: string;
}>) {
  const BOM = '\uFEFF';
  const headers = ['วันที่', 'เวลา', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'รายละเอียด'];
  
  const rows = transactions.map(t => [
    t.date,
    t.time || '',
    t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    t.amount.toString(),
    t.category,
    `"${(t.description || '').replace(/"/g, '""')}"`,
  ]);

  return BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

describe("CSV Export", () => {
  it("generates correct CSV headers with BOM", () => {
    const csv = generateCsvContent([]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('วันที่,เวลา,ประเภท,จำนวนเงิน,หมวดหมู่,รายละเอียด');
  });

  it("formats income transactions correctly", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', time: '10:30', type: 'income',
      amount: 30000, category: 'เงินเดือน', description: 'เงินเดือนมกราคม'
    }]);
    expect(csv).toContain('รายรับ');
    expect(csv).toContain('30000');
  });

  it("formats expense transactions correctly", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', time: null, type: 'expense',
      amount: 500, category: 'อาหาร', description: 'ข้าวกลางวัน'
    }]);
    expect(csv).toContain('รายจ่าย');
    expect(csv).toContain('500');
  });

  it("escapes double quotes in descriptions", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', type: 'expense',
      amount: 100, category: 'อื่นๆ', description: 'ค่า "พิเศษ"'
    }]);
    expect(csv).toContain('""พิเศษ""');
  });

  it("handles empty descriptions", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', type: 'expense',
      amount: 100, category: 'อื่นๆ', description: ''
    }]);
    expect(csv).toContain('""');
  });

  it("handles multiple transactions", () => {
    const csv = generateCsvContent([
      { date: '2024-01-01', type: 'income', amount: 30000, category: 'เงินเดือน', description: 'เงินเดือน' },
      { date: '2024-01-02', type: 'expense', amount: 50, category: 'อาหาร', description: 'กาแฟ' },
    ]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });
});
