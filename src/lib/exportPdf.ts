import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface TransactionRow {
  date: string;
  description: string;
  category: string;
  type: string;
  amount: number;
}

interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
}

interface PdfExportData {
  title: string;
  period: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: TransactionRow[];
  savingsRate?: number;
  avgDailyExpense?: number;
  topExpenseCategories?: CategoryBreakdown[];
  topIncomeCategories?: CategoryBreakdown[];
}

export async function exportSummaryPdf(data: PdfExportData) {
  const { title, period, totalIncome, totalExpense, balance, transactions, savingsRate, avgDailyExpense, topExpenseCategories, topIncomeCategories } = data;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;font-family:sans-serif;padding:40px;background:white;color:black;';
  
  const formatAmount = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  const categoryBreakdownHtml = (cats: CategoryBreakdown[] | undefined, label: string, color: string) => {
    if (!cats || cats.length === 0) return '';
    return `
      <div style="margin-bottom:20px;">
        <h3 style="font-size:15px;font-weight:bold;margin:0 0 10px 0;color:#333;">${label}</h3>
        ${cats.map(c => `
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">
              <span>${c.name}</span>
              <span style="color:#666;">${formatAmount(c.amount)} (${c.percentage.toFixed(1)}%)</span>
            </div>
            <div style="background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;">
              <div style="background:${color};height:100%;width:${c.percentage}%;border-radius:4px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };
  
  container.innerHTML = `
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:bold;margin:0;">MoneyMind - รายงานสรุป</h1>
      <p style="color:#666;margin:4px 0;">${title} | ${period}</p>
      <p style="color:#999;font-size:12px;">สร้างเมื่อ ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#666;font-size:13px;">รายรับรวม</div>
        <div style="font-size:20px;font-weight:bold;color:#16a34a;">${formatAmount(totalIncome)}</div>
      </div>
      <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#666;font-size:13px;">รายจ่ายรวม</div>
        <div style="font-size:20px;font-weight:bold;color:#dc2626;">${formatAmount(totalExpense)}</div>
      </div>
      <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#666;font-size:13px;">คงเหลือ</div>
        <div style="font-size:20px;font-weight:bold;color:${balance >= 0 ? '#2563eb' : '#dc2626'};">${balance >= 0 ? '+' : ''}${formatAmount(balance)}</div>
      </div>
    </div>

    ${(savingsRate !== undefined || avgDailyExpense !== undefined) ? `
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      ${savingsRate !== undefined ? `
      <div style="flex:1;background:#faf5ff;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#666;font-size:13px;">อัตราการออม</div>
        <div style="font-size:20px;font-weight:bold;color:${savingsRate >= 20 ? '#16a34a' : savingsRate >= 0 ? '#f59e0b' : '#dc2626'};">${savingsRate.toFixed(1)}%</div>
        <div style="font-size:11px;color:#999;">${savingsRate >= 30 ? 'ดีมาก!' : savingsRate >= 20 ? 'ดี' : savingsRate >= 0 ? 'ควรเพิ่ม' : 'ใช้เกินรายรับ'}</div>
      </div>` : ''}
      ${avgDailyExpense !== undefined ? `
      <div style="flex:1;background:#fff7ed;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#666;font-size:13px;">ค่าใช้จ่ายเฉลี่ย/วัน</div>
        <div style="font-size:20px;font-weight:bold;color:#ea580c;">${formatAmount(avgDailyExpense)}</div>
      </div>` : ''}
      <div style="flex:1;background:#f0f9ff;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#666;font-size:13px;">จำนวนรายการ</div>
        <div style="font-size:20px;font-weight:bold;color:#0284c7;">${transactions.length}</div>
      </div>
    </div>
    ` : ''}

    ${categoryBreakdownHtml(topExpenseCategories, '📊 หมวดหมู่รายจ่ายสูงสุด', '#ef4444')}
    ${categoryBreakdownHtml(topIncomeCategories, '💰 แหล่งรายรับหลัก', '#22c55e')}
    
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;">วันที่</th>
          <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;">รายละเอียด</th>
          <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;">หมวดหมู่</th>
          <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;">ประเภท</th>
          <th style="padding:10px;text-align:right;border-bottom:2px solid #e2e8f0;">จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map((t, i) => `
          <tr style="background:${i % 2 === 0 ? 'white' : '#f8fafc'};">
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${t.date}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${t.description}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${t.category}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:${t.type === 'income' ? '#16a34a' : '#dc2626'};">
              ${t.type === 'income' ? '+' : '-'}${formatAmount(t.amount)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div style="margin-top:24px;text-align:center;color:#999;font-size:11px;">
      <p>รายการทั้งหมด ${transactions.length} รายการ</p>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    await doc.html(container, {
      callback: (doc) => {
        doc.save(`moneymind-report-${new Date().toISOString().split('T')[0]}.pdf`);
      },
      x: 5,
      y: 5,
      width: 200,
      windowWidth: 800,
      html2canvas: {
        scale: 0.25,
      },
    });
  } finally {
    document.body.removeChild(container);
  }
}
