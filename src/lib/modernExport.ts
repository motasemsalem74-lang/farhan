/**
 * مكتبة التصدير والطباعة العصرية
 * تدعم PDF، Excel، وطباعة مباشرة مع تصاميم جذابة
 */

export interface ExportOptions {
  title: string
  subtitle?: string
  companyName?: string
  companyLogo?: string
  reportDate?: Date
  filters?: Record<string, any>
  watermark?: string
}

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  width?: string
  format?: (value: any) => string
}

export interface ExportData {
  headers: TableColumn[]
  rows: Record<string, any>[]
  summary?: Record<string, any>
  totals?: Record<string, any>
}

/**
 * إنشاء HTML للطباعة مع تصميم عصري
 */
export function createModernPrintHTML(
  data: ExportData,
  options: ExportOptions
): string {
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  const currentTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      direction: rtl;
      text-align: right;
      line-height: 1.6;
      color: #1a202c;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .print-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      position: relative;
    }
    
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
      opacity: 0.3;
      animation: float 20s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }
    
    .header-content {
      position: relative;
      z-index: 2;
    }
    
    .company-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .company-logo {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      backdrop-filter: blur(10px);
    }
    
    .company-details h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .company-details p {
      font-size: 16px;
      opacity: 0.9;
    }
    
    .report-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 20px;
    }
    
    .info-card {
      background: rgba(255, 255, 255, 0.15);
      padding: 20px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .info-card h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .info-card p {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .content {
      padding: 40px;
    }
    
    .filters-section {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 25px;
      border-radius: 15px;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
    }
    
    .filters-title {
      font-size: 18px;
      font-weight: 600;
      color: #4a5568;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    
    .filter-item {
      background: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    
    .filter-label {
      font-size: 12px;
      color: #718096;
      margin-bottom: 5px;
      font-weight: 500;
    }
    
    .filter-value {
      font-size: 14px;
      color: #2d3748;
      font-weight: 600;
    }
    
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
    }
    
    .data-table thead {
      background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
      color: white;
    }
    
    .data-table th {
      padding: 20px 15px;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
      position: relative;
    }
    
    .data-table th:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 0;
      top: 25%;
      height: 50%;
      width: 1px;
      background: rgba(255, 255, 255, 0.2);
    }
    
    .data-table tbody tr {
      transition: all 0.3s ease;
    }
    
    .data-table tbody tr:nth-child(even) {
      background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
    }
    
    .data-table tbody tr:hover {
      background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
      transform: scale(1.01);
    }
    
    .data-table td {
      padding: 15px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      text-align: center;
      position: relative;
    }
    
    .data-table tfoot {
      background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
      color: white;
      font-weight: 700;
    }
    
    .data-table tfoot td {
      padding: 20px 15px;
      font-size: 14px;
      border: none;
    }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #4f46e5, #7c3aed, #ec4899);
    }
    
    .summary-card h4 {
      font-size: 14px;
      color: #718096;
      margin-bottom: 10px;
      font-weight: 500;
    }
    
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .summary-card .description {
      font-size: 12px;
      color: #a0aec0;
    }
    
    .positive { color: #38a169; }
    .negative { color: #e53e3e; }
    .neutral { color: #4a5568; }
    
    .footer {
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      padding: 30px 40px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #718096;
    }
    
    .footer-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .footer-right {
      text-align: left;
      direction: ltr;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      color: rgba(0, 0, 0, 0.03);
      font-weight: 900;
      z-index: 1;
      pointer-events: none;
      user-select: none;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .print-container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .data-table tbody tr:hover {
        transform: none;
      }
      
      .header::before {
        animation: none;
      }
    }
    
    @media (max-width: 768px) {
      .company-info {
        flex-direction: column;
        text-align: center;
        gap: 20px;
      }
      
      .report-info {
        grid-template-columns: 1fr;
      }
      
      .filters-grid {
        grid-template-columns: 1fr;
      }
      
      .summary-cards {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  ${options.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}
  
  <div class="print-container">
    <div class="header">
      <div class="header-content">
        <div class="company-info">
          <div class="company-logo">
            ${options.companyLogo || '🏢'}
          </div>
          <div class="company-details">
            <h1>${options.companyName || 'شركة الفرحان للموتوسيكلات'}</h1>
            <p>نظام إدارة المبيعات والمخزون</p>
          </div>
        </div>
        
        <div class="report-info">
          <div class="info-card">
            <h3>📊 ${options.title}</h3>
            ${options.subtitle ? `<p>${options.subtitle}</p>` : ''}
          </div>
          <div class="info-card">
            <h3>📅 تاريخ التقرير</h3>
            <p>${currentDate}</p>
            <p>الساعة: ${currentTime}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="content">
      ${options.filters ? createFiltersSection(options.filters) : ''}
      
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              ${data.headers.map(header => 
                `<th style="text-align: ${header.align || 'center'}; ${header.width ? `width: ${header.width};` : ''}">${header.label}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.rows.map((row, index) => `
              <tr>
                ${data.headers.map(header => {
                  const value = row[header.key]
                  const formattedValue = header.format ? header.format(value) : value
                  return `<td style="text-align: ${header.align || 'center'}">${formattedValue || '-'}</td>`
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
          ${data.totals ? `
            <tfoot>
              <tr>
                ${data.headers.map((header, index) => {
                  if (index === 0) {
                    return `<td style="text-align: center; font-weight: bold;">الإجمالي</td>`
                  }
                  const value = data.totals![header.key]
                  const formattedValue = header.format ? header.format(value) : value
                  return `<td style="text-align: ${header.align || 'center'}">${formattedValue || '-'}</td>`
                }).join('')}
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
      
      ${data.summary ? createSummaryCards(data.summary) : ''}
    </div>
    
    <div class="footer">
      <div class="footer-left">
        <span>🖨️ طُبع في: ${currentDate} - ${currentTime}</span>
        <span>📄 عدد الصفحات: 1</span>
      </div>
      <div class="footer-right">
        <span>Powered by Al-Farhan System v2.0</span>
      </div>
    </div>
  </div>
  
  <script>
    // طباعة تلقائية عند فتح النافذة
    window.onload = function() {
      setTimeout(() => {
        window.print()
      }, 500)
    }
    
    // إغلاق النافذة بعد الطباعة أو الإلغاء
    window.onafterprint = function() {
      window.close()
    }
  </script>
</body>
</html>
  `
}

/**
 * إنشاء قسم الفلاتر
 */
function createFiltersSection(filters: Record<string, any>): string {
  const filterEntries = Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined && value !== '')
  
  if (filterEntries.length === 0) return ''
  
  return `
    <div class="filters-section">
      <div class="filters-title">
        🔍 معايير التصفية المطبقة
      </div>
      <div class="filters-grid">
        ${filterEntries.map(([key, value]) => `
          <div class="filter-item">
            <div class="filter-label">${getFilterLabel(key)}</div>
            <div class="filter-value">${formatFilterValue(key, value)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

/**
 * إنشاء بطاقات الملخص
 */
function createSummaryCards(summary: Record<string, any>): string {
  const summaryEntries = Object.entries(summary).filter(([_, value]) => value !== null && value !== undefined)
  
  if (summaryEntries.length === 0) return ''
  
  return `
    <div class="summary-cards">
      ${summaryEntries.map(([key, value]) => {
        const isPositive = typeof value === 'number' && value > 0
        const isNegative = typeof value === 'number' && value < 0
        const colorClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'
        
        return `
          <div class="summary-card">
            <h4>${getSummaryLabel(key)}</h4>
            <div class="value ${colorClass}">${formatSummaryValue(key, value)}</div>
            <div class="description">${getSummaryDescription(key, value)}</div>
          </div>
        `
      }).join('')}
    </div>
  `
}

/**
 * تسميات الفلاتر
 */
function getFilterLabel(key: string): string {
  const labels: Record<string, string> = {
    startDate: 'من تاريخ',
    endDate: 'إلى تاريخ',
    transactionType: 'نوع المعاملة',
    agentId: 'الوكيل',
    status: 'الحالة',
    reportType: 'نوع التقرير'
  }
  return labels[key] || key
}

/**
 * تنسيق قيم الفلاتر
 */
function formatFilterValue(key: string, value: any): string {
  if (key.includes('Date') && value) {
    return new Date(value).toLocaleDateString('ar-EG')
  }
  if (key === 'transactionType') {
    const types: Record<string, string> = {
      all: 'جميع المعاملات',
      sale: 'مبيعات',
      payment: 'مدفوعات',
      debt_increase: 'زيادة مديونية',
      debt_decrease: 'تقليل مديونية'
    }
    return types[value] || value
  }
  return String(value)
}

/**
 * تسميات الملخص
 */
function getSummaryLabel(key: string): string {
  const labels: Record<string, string> = {
    totalDebit: 'إجمالي المدين',
    totalCredit: 'إجمالي الدائن',
    netBalance: 'الرصيد الصافي',
    transactionCount: 'عدد المعاملات',
    totalSales: 'إجمالي المبيعات',
    totalProfit: 'إجمالي الأرباح'
  }
  return labels[key] || key
}

/**
 * تنسيق قيم الملخص
 */
function formatSummaryValue(key: string, value: any): string {
  if (typeof value === 'number') {
    if (key.includes('Count')) {
      return value.toLocaleString('ar-EG')
    }
    return value.toLocaleString('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }
  return String(value)
}

/**
 * وصف الملخص
 */
function getSummaryDescription(key: string, value: any): string {
  if (typeof value === 'number') {
    if (key === 'netBalance') {
      return value >= 0 ? 'رصيد دائن' : 'رصيد مدين'
    }
    if (key.includes('Count')) {
      return 'معاملة'
    }
    return 'جنيه مصري'
  }
  return ''
}

/**
 * طباعة مباشرة
 */
export function printReport(data: ExportData, options: ExportOptions): void {
  const htmlContent = createModernPrintHTML(data, options)
  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  } else {
    // Fallback: إنشاء blob وفتحه
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }
}

/**
 * تصدير CSV
 */
export function exportToCSV(data: ExportData, filename: string): void {
  let csvContent = '\uFEFF' // BOM for UTF-8
  
  // Headers
  csvContent += data.headers.map(h => h.label).join(',') + '\n'
  
  // Rows
  data.rows.forEach(row => {
    const rowData = data.headers.map(header => {
      const value = row[header.key]
      const formattedValue = header.format ? header.format(value) : value
      // Escape commas and quotes
      return `"${String(formattedValue || '').replace(/"/g, '""')}"`
    })
    csvContent += rowData.join(',') + '\n'
  })
  
  // Totals
  if (data.totals) {
    csvContent += '\n' + 'الإجمالي' + ','
    csvContent += data.headers.slice(1).map(header => {
      const value = data.totals![header.key]
      const formattedValue = header.format ? header.format(value) : value
      return `"${String(formattedValue || '').replace(/"/g, '""')}"`
    }).join(',') + '\n'
  }
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * تنسيق العملة
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/**
 * تنسيق التاريخ
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
