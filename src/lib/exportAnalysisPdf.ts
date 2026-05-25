import jsPDF from 'jspdf';

interface CashflowItem {
  name: string;
  income: number;
  expense: number;
  net: number;
  type: string;
}

interface PieItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface BudgetCategory {
  name: string;
  color: string;
  actual: number;
}

interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

interface AnalysisPdfData {
  period: string;
  cashflow: CashflowItem[];
  pieData: PieItem[];
  budget: {
    totalBudget: number;
    totalActual: number;
    percentUsed: number;
    categories: BudgetCategory[];
  };
  netWorth: NetWorthSummary;
}

const fmt = (n: number) => `฿${Math.abs(n).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}${fmt(n)}`;

export async function exportAnalysisPdf(data: AnalysisPdfData) {
  const { period, cashflow, pieData, budget, netWorth } = data;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;font-family:sans-serif;padding:40px;background:white;color:#1a1a2e;';

  const actualData = cashflow.filter(d => d.type !== 'forecast');
  const forecastData = cashflow.filter(d => d.type === 'forecast');

  const budgetColor = budget.percentUsed > 100 ? '#dc2626' : budget.percentUsed > 80 ? '#f59e0b' : '#16a34a';

  // Pie chart as horizontal bars (since we can't render SVG pie in PDF easily)
  const maxPieValue = Math.max(...pieData.map(p => p.value), 1);

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:30px;border-bottom:3px solid #6366f1;padding-bottom:20px;">
      <h1 style="font-size:26px;font-weight:bold;margin:0;color:#1a1a2e;">📊 MoneyMind - รายงานวิเคราะห์การเงิน</h1>
      <p style="color:#666;margin:6px 0 0;">${period}</p>
      <p style="color:#999;font-size:11px;margin:4px 0 0;">สร้างเมื่อ ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>

    <!-- NET WORTH SUMMARY -->
    <div style="display:flex;gap:12px;margin-bottom:28px;">
      <div style="flex:1;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:10px;padding:16px;text-align:center;border:1px solid #bbf7d0;">
        <div style="color:#666;font-size:12px;margin-bottom:4px;">💰 สินทรัพย์รวม</div>
        <div style="font-size:22px;font-weight:bold;color:#16a34a;">${fmt(netWorth.totalAssets)}</div>
      </div>
      <div style="flex:1;background:linear-gradient(135deg,#fef2f2,#fecaca);border-radius:10px;padding:16px;text-align:center;border:1px solid #fecaca;">
        <div style="color:#666;font-size:12px;margin-bottom:4px;">💳 หนี้สินรวม</div>
        <div style="font-size:22px;font-weight:bold;color:#dc2626;">${fmt(netWorth.totalLiabilities)}</div>
      </div>
      <div style="flex:1;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:10px;padding:16px;text-align:center;border:1px solid #bfdbfe;">
        <div style="color:#666;font-size:12px;margin-bottom:4px;">🏦 มูลค่าสุทธิ</div>
        <div style="font-size:22px;font-weight:bold;color:${netWorth.netWorth >= 0 ? '#2563eb' : '#dc2626'};">${fmtSigned(netWorth.netWorth)}</div>
      </div>
    </div>

    <!-- CASHFLOW FORECAST -->
    <div style="margin-bottom:28px;background:#fafafa;border-radius:10px;padding:20px;border:1px solid #e5e7eb;">
      <h2 style="font-size:17px;font-weight:bold;margin:0 0 4px;color:#1a1a2e;">🔮 พยากรณ์กระแสเงินสด</h2>
      <p style="font-size:11px;color:#999;margin:0 0 16px;">ข้อมูลจริง + คาดการณ์ล่วงหน้า</p>
      
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #cbd5e1;">เดือน</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #cbd5e1;">รายรับ</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #cbd5e1;">รายจ่าย</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #cbd5e1;">คงเหลือ</th>
            <th style="padding:8px 10px;text-align:center;border-bottom:2px solid #cbd5e1;">ประเภท</th>
          </tr>
        </thead>
        <tbody>
          ${cashflow.map((d, i) => `
            <tr style="background:${i % 2 === 0 ? 'white' : '#f8fafc'};">
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-weight:${d.type === 'current' ? 'bold' : 'normal'};">${d.name}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#16a34a;">${fmt(d.income)}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#dc2626;">${fmt(d.expense)}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:${d.net >= 0 ? '#16a34a' : '#dc2626'};font-weight:bold;">${fmtSigned(d.net)}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
                <span style="background:${d.type === 'forecast' ? '#dbeafe' : d.type === 'current' ? '#fef3c7' : '#f1f5f9'};color:${d.type === 'forecast' ? '#2563eb' : d.type === 'current' ? '#d97706' : '#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;">
                  ${d.type === 'forecast' ? 'คาดการณ์' : d.type === 'current' ? 'เดือนนี้' : 'จริง'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- PIE CHART (as bars) -->
    <div style="margin-bottom:28px;background:#fafafa;border-radius:10px;padding:20px;border:1px solid #e5e7eb;">
      <h2 style="font-size:17px;font-weight:bold;margin:0 0 4px;color:#1a1a2e;">🥧 สัดส่วนรายจ่ายตามหมวดหมู่</h2>
      <p style="font-size:11px;color:#999;margin:0 0 16px;">${period}</p>
      
      ${pieData.length > 0 ? pieData.map(p => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};"></span>
              ${p.name}
            </span>
            <span style="color:#555;">${fmt(p.value)} <span style="color:#999;font-size:11px;">(${p.percentage.toFixed(1)}%)</span></span>
          </div>
          <div style="background:#e2e8f0;border-radius:6px;height:10px;overflow:hidden;">
            <div style="background:${p.color};height:100%;width:${(p.value / maxPieValue) * 100}%;border-radius:6px;"></div>
          </div>
        </div>
      `).join('') : '<p style="text-align:center;color:#999;">ไม่มีข้อมูลรายจ่าย</p>'}
    </div>

    <!-- BUDGET SUMMARY -->
    <div style="background:#fafafa;border-radius:10px;padding:20px;border:1px solid #e5e7eb;">
      <h2 style="font-size:17px;font-weight:bold;margin:0 0 4px;color:#1a1a2e;">🎯 สรุปงบประมาณ</h2>
      <p style="font-size:11px;color:#999;margin:0 0 16px;">${period}</p>
      
      ${budget.totalBudget > 0 ? `
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div style="flex:1;background:white;border-radius:8px;padding:14px;text-align:center;border:1px solid #e5e7eb;">
            <div style="color:#666;font-size:12px;">งบประมาณ</div>
            <div style="font-size:20px;font-weight:bold;color:#2563eb;">${fmt(budget.totalBudget)}</div>
          </div>
          <div style="flex:1;background:white;border-radius:8px;padding:14px;text-align:center;border:1px solid #e5e7eb;">
            <div style="color:#666;font-size:12px;">ใช้จ่ายจริง</div>
            <div style="font-size:20px;font-weight:bold;color:${budgetColor};">${fmt(budget.totalActual)}</div>
          </div>
          <div style="flex:1;background:white;border-radius:8px;padding:14px;text-align:center;border:1px solid #e5e7eb;">
            <div style="color:#666;font-size:12px;">คงเหลือ</div>
            <div style="font-size:20px;font-weight:bold;color:${budget.totalBudget - budget.totalActual >= 0 ? '#16a34a' : '#dc2626'};">${fmt(budget.totalBudget - budget.totalActual)}</div>
          </div>
        </div>
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px;">
            <span>ใช้ไป ${budget.percentUsed.toFixed(0)}%</span>
            <span>เหลือ ${Math.max(100 - budget.percentUsed, 0).toFixed(0)}%</span>
          </div>
          <div style="background:#e2e8f0;border-radius:8px;height:14px;overflow:hidden;">
            <div style="background:${budgetColor};height:100%;width:${Math.min(budget.percentUsed, 100)}%;border-radius:8px;"></div>
          </div>
        </div>
      ` : '<p style="text-align:center;color:#999;padding:12px;">ยังไม่ได้ตั้งงบประมาณ</p>'}

      ${budget.categories.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#e2e8f0;">
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #cbd5e1;">หมวดหมู่</th>
              <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #cbd5e1;">ใช้จ่ายจริง</th>
            </tr>
          </thead>
          <tbody>
            ${budget.categories.map((c, i) => `
              <tr style="background:${i % 2 === 0 ? 'white' : '#f8fafc'};">
                <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c.color};margin-right:6px;"></span>
                  ${c.name}
                </td>
                <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:500;color:#dc2626;">${fmt(c.actual)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>

    <div style="margin-top:30px;text-align:center;color:#999;font-size:10px;border-top:1px solid #e5e7eb;padding-top:12px;">
      <p>MoneyMind Financial Analysis Report • ${new Date().toLocaleDateString('th-TH')}</p>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    await doc.html(container, {
      callback: (doc) => {
        doc.save(`moneymind-analysis-${new Date().toISOString().split('T')[0]}.pdf`);
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
