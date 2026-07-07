/**
 * CSV import parser for income/expense transactions.
 *
 * Accepts the format produced by `exportCsv.ts` (Thai headers) as well as common
 * English aliases, and tolerates Excel quirks (BOM, CRLF, quoted fields). The
 * parser is pure and DOM-free so it is easy to unit-test; resolving category and
 * account *names* to database ids happens in the UI layer where that data lives.
 */

export interface ParsedTransaction {
  /** 1-based line number in the source file (including header). */
  line: number;
  date: string; // normalised YYYY-MM-DD
  time?: string; // HH:mm
  type: "income" | "expense";
  amount: number;
  categoryName?: string;
  description?: string;
  accountName?: string;
  note?: string;
}

export interface ImportRowError {
  line: number;
  raw: string[];
  error: string;
}

export interface ParseResult {
  valid: ParsedTransaction[];
  errors: ImportRowError[];
  /** Set when the header row can't be understood; `valid`/`errors` will be empty. */
  headerError?: string;
}

type Field = "date" | "time" | "type" | "amount" | "category" | "description" | "account" | "note";

const HEADER_ALIASES: Record<Field, string[]> = {
  date: ["วันที่", "date", "วัน"],
  time: ["เวลา", "time"],
  type: ["ประเภท", "type", "ชนิด"],
  amount: ["จำนวนเงิน", "amount", "ยอดเงิน", "จำนวน", "ยอด"],
  category: ["หมวดหมู่", "category", "หมวด"],
  description: ["รายละเอียด", "description", "รายการ", "detail", "memo", "คำอธิบาย"],
  account: ["บัญชี", "account"],
  note: ["หมายเหตุ", "note", "โน้ต", "remark"],
};

/** Tokenise CSV text into rows of fields (RFC-4180-ish: quotes, "" escapes, CRLF). */
export function parseCsvRows(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, ""); // strip BOM
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore; CRLF handled by the \n branch
    } else {
      field += c;
    }
  }
  // flush trailing field/row
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // drop fully-empty rows (e.g. trailing blank line)
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function buildHeaderMap(header: string[]): Partial<Record<Field, number>> {
  const map: Partial<Record<Field, number>> = {};
  header.forEach((cell, idx) => {
    const norm = cell.trim().toLowerCase();
    (Object.keys(HEADER_ALIASES) as Field[]).forEach((field) => {
      if (map[field] !== undefined) return;
      if (HEADER_ALIASES[field].some((alias) => alias.toLowerCase() === norm)) {
        map[field] = idx;
      }
    });
  });
  return map;
}

/** Normalise a date string to YYYY-MM-DD, or return null if invalid. */
export function normalizeDate(input: string): string | null {
  const s = input.trim();
  let y: number, mo: number, d: number;

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); // YYYY-MM-DD
  if (m) {
    y = +m[1];
    mo = +m[2];
    d = +m[3];
  } else {
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // DD/MM/YYYY (day-first, Thai)
    if (m) {
      d = +m[1];
      mo = +m[2];
      y = +m[3];
    } else {
      return null;
    }
  }

  // Convert Thai Buddhist year to Gregorian if needed.
  if (y >= 2400) y -= 543;

  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;

  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeTime(input: string): string | undefined {
  const s = input.trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const h = +m[1];
  const min = +m[2];
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseType(input: string): "income" | "expense" | null {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  if (raw === "รายรับ" || raw === "รับ" || raw === "เงินเข้า" || lower === "income" || lower === "in") return "income";
  if (raw === "รายจ่าย" || raw === "จ่าย" || raw === "เงินออก" || lower === "expense" || lower === "out") return "expense";
  return null;
}

function parseAmount(input: string): number | null {
  const cleaned = input.replace(/฿|thb|บาท/gi, "").replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!isFinite(n)) return null;
  return Math.abs(n);
}

/**
 * Parse transaction CSV text into validated rows and per-row errors.
 * Category/account columns are returned as names for later id resolution.
 */
export function parseTransactionsCsv(text: string): ParseResult {
  return parseTransactionsFromRows(parseCsvRows(text));
}

/** แกนกลางของการนำเข้า — รับ rows ตรง ๆ เพื่อให้ใช้ร่วมกับแหล่งอื่นได้ (เช่น Excel) */
export function parseTransactionsFromRows(rows: string[][]): ParseResult {
  if (rows.length === 0) return { valid: [], errors: [], headerError: "ไฟล์ว่างเปล่า" };

  const header = rows[0];
  const map = buildHeaderMap(header);

  if (map.date === undefined || map.type === undefined || map.amount === undefined) {
    return {
      valid: [],
      errors: [],
      headerError: "ไม่พบคอลัมน์ที่จำเป็น (ต้องมี: วันที่, ประเภท, จำนวนเงิน)",
    };
  }

  const valid: ParsedTransaction[] = [];
  const errors: ImportRowError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const line = i + 1; // 1-based, header is line 1
    const get = (f: Field) => (map[f] !== undefined ? (raw[map[f]!] ?? "").trim() : "");

    const date = normalizeDate(get("date"));
    if (!date) {
      errors.push({ line, raw, error: `วันที่ไม่ถูกต้อง: "${get("date")}"` });
      continue;
    }
    const type = parseType(get("type"));
    if (!type) {
      errors.push({ line, raw, error: `ประเภทไม่ถูกต้อง: "${get("type")}" (ต้องเป็น รายรับ/รายจ่าย)` });
      continue;
    }
    const amount = parseAmount(get("amount"));
    if (amount === null || amount <= 0) {
      errors.push({ line, raw, error: `จำนวนเงินไม่ถูกต้อง: "${get("amount")}"` });
      continue;
    }
    if (amount > 10_000_000) {
      errors.push({ line, raw, error: `จำนวนเงินเกินขีดจำกัด: ${amount}` });
      continue;
    }

    valid.push({
      line,
      date,
      time: normalizeTime(get("time")),
      type,
      amount,
      categoryName: get("category") || undefined,
      description: get("description") || undefined,
      accountName: get("account") || undefined,
      note: get("note") || undefined,
    });
  }

  return { valid, errors };
}
