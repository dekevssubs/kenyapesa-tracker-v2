import { formatCurrency } from '../../utils/calculations'

/**
 * Printable Report Component
 * Generates a print-friendly report that can be saved as PDF via browser print
 */
export function generatePrintableReport(reportData, type = 'monthly') {
  const {
    title,
    period,
    summary,
    categories,
    transactions,
    generatedAt
  } = reportData

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .period {
      color: #666;
      font-size: 16px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .summary-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
    }
    .summary-value.income { color: #10b981; }
    .summary-value.expense { color: #ef4444; }
    .summary-value.savings { color: #3b82f6; }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e5e5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
    }
    td {
      font-size: 14px;
    }
    .amount {
      font-family: 'SF Mono', Consolas, monospace;
      text-align: right;
    }
    .category-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .category-name {
      font-weight: 500;
    }
    .category-amount {
      font-family: 'SF Mono', Consolas, monospace;
    }
    .progress-bar {
      height: 8px;
      background: #e5e5e5;
      border-radius: 4px;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      background: #ef4444;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">KenyaPesa Tracker</div>
    <h1>${title}</h1>
    <p class="period">${period}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Total Income</div>
      <div class="summary-value income">${formatCurrency(summary.totalIncome)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Expenses</div>
      <div class="summary-value expense">${formatCurrency(summary.totalExpenses)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Net Savings</div>
      <div class="summary-value savings">${formatCurrency(summary.netSavings)}</div>
    </div>
  </div>

  ${categories && categories.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Spending by Category</h2>
    ${categories.map(cat => `
      <div class="category-row">
        <span class="category-name">${cat.name}</span>
        <span class="category-amount">${formatCurrency(cat.amount)} (${cat.percentage}%)</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${cat.percentage}%"></div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${transactions && transactions.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Recent Transactions (Last 20)</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.slice(0, 20).map(tx => `
          <tr>
            <td>${new Date(tx.date).toLocaleDateString('en-KE')}</td>
            <td>${tx.description || '-'}</td>
            <td>${tx.category || '-'}</td>
            <td class="amount">${formatCurrency(tx.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${generatedAt || new Date().toLocaleString('en-KE')}</p>
    <p>KenyaPesa Tracker - Personal Finance Management</p>
  </div>

  <script>
    // Auto-trigger print dialog
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
`

  return html
}

/**
 * Open printable report in new window
 */
export function openPrintableReport(reportData, type = 'monthly') {
  const html = generatePrintableReport(reportData, type)
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * Export button component
 */
export default function ExportReportButton({
  reportData,
  type = 'monthly',
  className = ''
}) {
  const handleExport = () => {
    openPrintableReport(reportData, type)
  }

  return (
    <button
      onClick={handleExport}
      className={`btn btn-secondary flex items-center gap-2 ${className}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export PDF
    </button>
  )
}
