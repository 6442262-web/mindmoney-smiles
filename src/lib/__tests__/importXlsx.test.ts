import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseTransactionsXlsx, isExcelFile } from '@/lib/importXlsx';

// สร้าง workbook จริงใน memory แล้วแปลงเป็น ArrayBuffer เหมือนไฟล์ที่ผู้ใช้อัปโหลด
function makeXlsx(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return out;
}

describe('parseTransactionsXlsx', () => {
  it('อ่านไฟล์ Excel หัวตารางไทย + เซลล์วันที่แบบ Date + จำนวนเงินตัวเลข', async () => {
    const buf = makeXlsx([
      ['วันที่', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'รายละเอียด'],
      [new Date(2026, 6, 4), 'รายจ่าย', 150, 'อาหาร', 'ข้าวมันไก่'],
      ['04/07/2569', 'รายรับ', 5000.5, 'เงินเดือน', 'โอที'],
    ]);

    const result = await parseTransactionsXlsx(buf);
    expect(result.headerError).toBeUndefined();
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(2);

    expect(result.valid[0]).toMatchObject({
      date: '2026-07-04', type: 'expense', amount: 150,
      categoryName: 'อาหาร', description: 'ข้าวมันไก่',
    });
    // ปี พ.ศ. 2569 ต้องถูกแปลงเป็น ค.ศ. 2026
    expect(result.valid[1]).toMatchObject({ date: '2026-07-04', type: 'income', amount: 5000.5 });
  });

  it('แถวเสียถูกแยกเป็น error โดยแถวดียังนำเข้าได้', async () => {
    const buf = makeXlsx([
      ['วันที่', 'ประเภท', 'จำนวนเงิน'],
      ['ไม่ใช่วันที่', 'รายจ่าย', 100],
      ['2026-01-15', 'รายจ่าย', 100],
    ]);
    const result = await parseTransactionsXlsx(buf);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('วันที่');
  });

  it('ไม่มีคอลัมน์จำเป็น → headerError', async () => {
    const buf = makeXlsx([['ชื่อ', 'อายุ'], ['สมชาย', 15]]);
    const result = await parseTransactionsXlsx(buf);
    expect(result.headerError).toBeTruthy();
  });

  it('แถวว่างท้ายไฟล์ถูกข้าม ไม่กลายเป็น error', async () => {
    const buf = makeXlsx([
      ['วันที่', 'ประเภท', 'จำนวนเงิน'],
      ['2026-01-15', 'รายจ่าย', 100],
      ['', '', ''],
    ]);
    const result = await parseTransactionsXlsx(buf);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});

describe('isExcelFile', () => {
  it('แยกนามสกุลถูก', () => {
    expect(isExcelFile('data.xlsx')).toBe(true);
    expect(isExcelFile('DATA.XLS')).toBe(true);
    expect(isExcelFile('data.csv')).toBe(false);
    expect(isExcelFile('data.xlsx.csv')).toBe(false);
  });
});
