import { parseTransactionsFromRows, type ParseResult } from "./importCsv";

/**
 * อ่านไฟล์ Excel (.xlsx/.xls) เป็นรายการธุรกรรม — ใช้หัวตารางชุดเดียวกับ CSV
 * โหลดไลบรารี xlsx แบบ dynamic เฉพาะตอนใช้งาน จะได้ไม่ถ่วงขนาดแอปตอนเปิด
 */
export async function parseTransactionsXlsx(data: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import("xlsx");

  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { valid: [], errors: [], headerError: "ไฟล์ Excel ไม่มีแผ่นงาน" };

  const sheet = workbook.Sheets[sheetName];
  // raw:true + cellDates:true → เซลล์วันที่เป็น Date object แปลงเองแบบไม่งง locale
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];

  const rows: string[][] = rawRows
    .map((row) =>
      row.map((cell) => {
        if (cell instanceof Date) {
          const y = cell.getFullYear();
          const mo = String(cell.getMonth() + 1).padStart(2, "0");
          const d = String(cell.getDate()).padStart(2, "0");
          return `${y}-${mo}-${d}`;
        }
        return String(cell ?? "").trim();
      })
    )
    .filter((row) => row.some((cell) => cell !== ""));

  return parseTransactionsFromRows(rows);
}

/** ไฟล์นี้เป็น Excel ไหม (ดูจากนามสกุล) */
export function isExcelFile(fileName: string): boolean {
  return /\.(xlsx|xls)$/i.test(fileName);
}
