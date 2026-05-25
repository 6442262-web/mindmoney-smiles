import { describe, it, expect } from "vitest";
import { generateCsvContent } from "../exportCsv";

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
    expect(csv).toContain('30000.00');
  });

  it("formats expense transactions correctly", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', time: null, type: 'expense',
      amount: 500, category: 'อาหาร', description: 'ข้าวกลางวัน'
    }]);
    expect(csv).toContain('รายจ่าย');
    expect(csv).toContain('500.00');
  });

  it("escapes descriptions with commas", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', type: 'expense',
      amount: 100, category: 'อื่นๆ', description: 'ค่าน้ำ, ค่าไฟ'
    }]);
    expect(csv).toContain('"ค่าน้ำ, ค่าไฟ"');
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
    // Empty description should be plain empty, not quoted
    const lines = csv.split('\n');
    expect(lines[1].endsWith(',')).toBe(true);
  });

  it("handles multiple transactions", () => {
    const csv = generateCsvContent([
      { date: '2024-01-01', type: 'income', amount: 30000, category: 'เงินเดือน', description: 'เงินเดือน' },
      { date: '2024-01-02', type: 'expense', amount: 50, category: 'อาหาร', description: 'กาแฟ' },
    ]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it("includes account column when requested", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', type: 'expense',
      amount: 100, category: 'อื่นๆ', description: 'test', account: 'ธนาคารกสิกร'
    }], { includeAccount: true });
    expect(csv).toContain('บัญชี');
    expect(csv).toContain('ธนาคารกสิกร');
  });

  it("includes note column when requested", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', type: 'expense',
      amount: 100, category: 'อื่นๆ', description: 'test', note: 'หมายเหตุทดสอบ'
    }], { includeNote: true });
    expect(csv).toContain('หมายเหตุ');
    expect(csv).toContain('หมายเหตุทดสอบ');
  });

  it("sanitizes HTML in descriptions", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', type: 'expense',
      amount: 100, category: 'อื่นๆ', description: '<script>alert(1)</script>test'
    }]);
    expect(csv).not.toContain('<script>');
    expect(csv).toContain('alert(1)test');
  });

  it("formats amounts with 2 decimal places", () => {
    const csv = generateCsvContent([{
      date: '2024-01-15', type: 'expense',
      amount: 100, category: 'อื่นๆ', description: 'test'
    }]);
    expect(csv).toContain('100.00');
  });
});
