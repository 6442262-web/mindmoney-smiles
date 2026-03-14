/**
 * CSV Export utility with BOM for Thai language support in Excel
 */

import { sanitizeText } from './validation';

interface CsvTransaction {
  date: string;
  time?: string | null;
  type: string;
  amount: number;
  category: string;
  description: string;
  account?: string;
  note?: string | null;
}

/** Escape a CSV field value properly */
function escapeCsvField(value: string): string {
  const sanitized = sanitizeText(value);
  // If field contains comma, quote, or newline, wrap in quotes
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/** Generate CSV content string (testable without DOM) */
export function generateCsvContent(
  transactions: CsvTransaction[],
  options?: { includeAccount?: boolean; includeNote?: boolean }
): string {
  const BOM = '\uFEFF';
  const headers = ['วันที่', 'เวลา', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'รายละเอียด'];
  if (options?.includeAccount) headers.push('บัญชี');
  if (options?.includeNote) headers.push('หมายเหตุ');
  
  const rows = transactions.map(t => {
    const row = [
      t.date,
      t.time || '',
      t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      t.amount.toFixed(2),
      escapeCsvField(t.category),
      escapeCsvField(t.description || ''),
    ];
    if (options?.includeAccount) row.push(escapeCsvField(t.account || ''));
    if (options?.includeNote) row.push(escapeCsvField(t.note || ''));
    return row;
  });

  return BOM + [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
}

export function exportTransactionsCsv(
  transactions: CsvTransaction[],
  filename: string = 'transactions',
  options?: { includeAccount?: boolean; includeNote?: boolean }
) {
  if (transactions.length === 0) return;

  const csvContent = generateCsvContent(transactions, options);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
