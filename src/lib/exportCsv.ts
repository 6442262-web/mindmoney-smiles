/**
 * CSV Export utility with BOM for Thai language support in Excel
 */

interface CsvTransaction {
  date: string;
  time?: string | null;
  type: string;
  amount: number;
  category: string;
  description: string;
}

export function exportTransactionsCsv(
  transactions: CsvTransaction[],
  filename: string = 'transactions'
) {
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

  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
