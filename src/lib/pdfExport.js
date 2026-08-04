import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './utils'
import { analytics } from './analytics'

/**
 * Format currency safely for jsPDF without font encoding glitches (e.g. 'Rs. 1,000.00')
 */
function formatPdfCurrency(amount) {
  if (amount == null || isNaN(amount)) return 'Rs. 0.00'
  const num = Number(amount)
  const abs = Math.abs(num)
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(abs)
  return `${num < 0 ? '-' : ''}Rs. ${formatted}`
}

/**
 * Helper to group expense list date-wise with daily sub-totals for PDF export
 */
function buildGroupedExpenseRows(expensesList) {
  if (!expensesList || expensesList.length === 0) {
    return [['No expenses recorded for this month', '-', '-', 'Rs. 0.00']]
  }

  // Group items by date (YYYY-MM-DD)
  const groups = {}
  expensesList.forEach(e => {
    const d = e.date || 'Unknown'
    if (!groups[d]) groups[d] = []
    groups[d].push(e)
  })

  // Sort dates descending (newest first)
  const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a))

  const rows = []
  sortedDates.forEach(dateStr => {
    const items = groups[dateStr]
    const dayTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

    // Add Date Sub-Header Row spanning all 4 columns
    rows.push([
      {
        content: `Date: ${formatDate(dateStr)}   •   Daily Total: ${formatPdfCurrency(dayTotal)}   (${items.length} entry${items.length > 1 ? 's' : ''})`,
        colSpan: 4,
        styles: {
          fontStyle: 'bold',
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 8.5
        }
      }
    ])

    // Add individual expense rows under this date
    items.forEach(item => {
      rows.push([
        formatDate(item.date),
        item.description || 'General Expense',
        item.account_name || 'Cash/Online',
        formatPdfCurrency(item.amount)
      ])
    })
  })

  return rows
}

/**
 * Professional PDF Financial Report Exporter for Accountize
 */
export function exportToPDF(type, data, currentMonth, user = null) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ── Colors ─────────────────────────────────────────────────────────────
    const primaryColor = [15, 23, 42]     // #0f172a (Dark slate)
    const accentColor = [99, 102, 241]    // #6366f1 (Indigo)
    const mutedColor = [100, 116, 139]    // #64748b (Slate 500)
    const lightBg = [248, 250, 252]       // #f8fafc (Slate 50)
    const borderColor = [226, 232, 240]   // #e2e8f0

    // Format Month Title (e.g., "2026-08" -> "August 2026")
    let monthLabel = currentMonth || 'Current Month'
    if (currentMonth && currentMonth.includes('-')) {
      const [year, month] = currentMonth.split('-')
      const d = new Date(parseInt(year), parseInt(month) - 1, 1)
      if (!isNaN(d.getTime())) {
        monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
    }

    // ── Header Banner ──────────────────────────────────────────────────────
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Logo / Title
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Accountize', 14, 16)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(199, 210, 254) // light indigo
    doc.text('PERSONAL FINANCIAL STATEMENT', 14, 22)

    // Right Header - Date & User
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(monthLabel, pageWidth - 14, 14, { align: 'right' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(203, 213, 225)
    const userEmail = user?.email || 'Personal Account'
    doc.text(userEmail, pageWidth - 14, 21, { align: 'right' })

    let startY = 36

    // ── Report Metadata Subheader ──────────────────────────────────────────
    doc.setFontSize(8)
    doc.setTextColor(...mutedColor)
    const timestampStr = new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })
    doc.text(`Generated on: ${timestampStr}`, 14, startY)
    doc.text(`Report Type: ${type === 'dashboard' ? 'Executive Financial Summary' : 'Detailed Expense Statement'}`, pageWidth - 14, startY, { align: 'right' })

    startY += 8

    if (type === 'dashboard') {
      // ── Dashboard Metrics Executive Cards ──────────────────────────────────
      const summary = data?.summary || {}
      const payableAccs = data?.payables || data?.payableAccounts || (data?.balances || []).filter(a => a.type === 'payable')
      const receivableAccs = data?.receivables || data?.receivableAccounts || (data?.balances || []).filter(a => a.type === 'receivable')

      const totalPayable = data?.totalPayables ?? payableAccs.reduce((acc, a) => acc + (Number(a.balance) || 0), 0)
      const totalReceivable = data?.totalReceivables ?? receivableAccs.reduce((acc, a) => acc + (Number(a.balance) || 0), 0)
      const netPosition = data?.availableBalance ?? (totalReceivable - totalPayable)
      const onlineBalance = data?.onlineBalance ?? 0

      const formatSubtype = (acc, defaultLabel) => {
        if (acc?.subtype && acc.subtype !== 'other') {
          return acc.subtype.toUpperCase()
        }
        return (acc?.type || defaultLabel).toUpperCase()
      }

      // 4 Metric Boxes Grid
      const cardWidth = (pageWidth - 28 - 9) / 4
      const cardHeight = 22
      const metrics = [
        { label: 'Total Payable', val: formatPdfCurrency(totalPayable), color: [239, 68, 68] },
        { label: 'Total Receivable', val: formatPdfCurrency(totalReceivable), color: [16, 185, 129] },
        { label: 'Net Liquidity', val: formatPdfCurrency(netPosition), color: netPosition >= 0 ? [16, 185, 129] : [239, 68, 68] },
        { label: 'Online / Bank Balance', val: formatPdfCurrency(onlineBalance), color: [59, 130, 246] }
      ]

      metrics.forEach((m, idx) => {
        const x = 14 + idx * (cardWidth + 3)
        doc.setFillColor(...lightBg)
        doc.setDrawColor(...borderColor)
        doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD')

        doc.setFontSize(7)
        doc.setTextColor(...mutedColor)
        doc.setFont('helvetica', 'normal')
        doc.text(m.label, x + 4, startY + 6)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...m.color)
        doc.text(m.val, x + 4, startY + 16)
      })

      startY += cardHeight + 10

      // ── Section 1: Payable Accounts Table ─────────────────────────────────
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryColor)
      doc.text('1. Payable Accounts Breakdown', 14, startY)
      startY += 4

      const payableRows = payableAccs.map(a => [
        a.name,
        formatSubtype(a, 'PAYABLE'),
        formatPdfCurrency(a.balance),
        a.updated_at || a.last_updated ? formatDate(a.updated_at || a.last_updated) : 'Up to date'
      ])

      if (payableRows.length === 0) {
        payableRows.push(['No payable accounts found', '-', 'Rs. 0.00', '-'])
      }

      autoTable(doc, {
        startY: startY,
        head: [['Account Name', 'Account Type', 'Current Balance', 'Last Activity']],
        body: payableRows,
        theme: 'striped',
        headStyles: { fillStyle: 'F', fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      })

      startY = doc.lastAutoTable.finalY + 10

      // ── Section 2: Receivable Accounts Table ──────────────────────────────
      if (startY + 40 > pageHeight) {
        doc.addPage()
        startY = 20
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryColor)
      doc.text('2. Receivable Accounts Breakdown', 14, startY)
      startY += 4

      const receivableRows = receivableAccs.map(a => [
        a.name,
        formatSubtype(a, 'RECEIVABLE'),
        formatPdfCurrency(a.balance),
        a.updated_at || a.last_updated ? formatDate(a.updated_at || a.last_updated) : 'Up to date'
      ])

      if (receivableRows.length === 0) {
        receivableRows.push(['No receivable accounts found', '-', 'Rs. 0.00', '-'])
      }

      autoTable(doc, {
        startY: startY,
        head: [['Receivable Person / Entity', 'Account Type', 'Outstanding Amount', 'Last Activity']],
        body: receivableRows,
        theme: 'striped',
        headStyles: { fillStyle: 'F', fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] } },
        margin: { left: 14, right: 14 }
      })

      startY = doc.lastAutoTable.finalY + 10

      // ── Section 3: Self Accounts & Liquidity Breakdown Table ───────────────
      if (startY + 40 > pageHeight) {
        doc.addPage()
        startY = 20
      }

      const selfAccs = data?.selfAccounts || (data?.balances || []).filter(a => a.type === 'self')

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryColor)
      doc.text('3. Self Accounts & Liquidity Breakdown', 14, startY)
      startY += 4

      const selfRows = selfAccs.map(a => [
        a.name,
        formatSubtype(a, 'SELF'),
        formatPdfCurrency(a.balance),
        a.updated_at || a.last_updated ? formatDate(a.updated_at || a.last_updated) : 'Up to date'
      ])

      if (selfRows.length === 0) {
        selfRows.push(['No self accounts found', '-', 'Rs. 0.00', '-'])
      }

      autoTable(doc, {
        startY: startY,
        head: [['Self Account Name', 'Category / Subtype', 'Current Balance', 'Last Activity']],
        body: selfRows,
        theme: 'striped',
        headStyles: { fillStyle: 'F', fillColor: [16, 185, 129], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold', textColor: [59, 130, 246] } },
        margin: { left: 14, right: 14 }
      })

      startY = doc.lastAutoTable.finalY + 10

      // ── Section 4: Monthly Expense Details Breakdown (Date-Wise Grouped) ──
      if (startY + 40 > pageHeight) {
        doc.addPage()
        startY = 20
      }

      const expensesList = data?.expenses || []
      const totalExpense = data?.totalExpenses ?? expensesList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryColor)
      doc.text(`4. Monthly Expense Details Breakdown (Total: ${formatPdfCurrency(totalExpense)})`, 14, startY)
      startY += 4

      const expenseRows = buildGroupedExpenseRows(expensesList)

      autoTable(doc, {
        startY: startY,
        head: [['Date', 'Description / Expense Note', 'Paid Via / Account', 'Amount']],
        body: expenseRows,
        theme: 'striped',
        headStyles: { fillStyle: 'F', fillColor: [239, 68, 68], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold', textColor: [239, 68, 68] } },
        margin: { left: 14, right: 14 }
      })

      startY = doc.lastAutoTable.finalY + 10

      // ── Fault Reconciliation Status Card ─────────────────────────────────
      if (startY + 30 > pageHeight) {
        doc.addPage()
        startY = 20
      }

      const isVerified = summary.verified ?? true
      const faultAmt = summary.fault_amount || 0

      doc.setFillColor(isVerified ? 240 : 254, isVerified ? 253 : 242, isVerified ? 244 : 242)
      doc.setDrawColor(isVerified ? 187 : 254, isVerified ? 247 : 202, isVerified ? 208 : 202)
      doc.roundedRect(14, startY, pageWidth - 28, 20, 2, 2, 'FD')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(isVerified ? 22 : 185, isVerified ? 101 : 28, isVerified ? 52 : 28) // green or red
      doc.text(isVerified ? '✓ Double-Entry Ledger Verification: 100% Balanced' : '⚠ Reconciliation Fault Detected', 18, startY + 8)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...mutedColor)
      doc.text(
        isVerified
          ? 'All manual balance declarations match total account balances perfectly.'
          : `Discrepancy of ${formatPdfCurrency(Math.abs(faultAmt))} identified between declared manual balances and account balances.`,
        18,
        startY + 15
      )

    } else if (type === 'expenses') {
      // ── Expense Report Metrics Cards ──────────────────────────────────────
      const expensesList = data?.expenses || []
      const totalExpense = expensesList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
      const perDayAvg = data?.perDayAvg || (expensesList.length > 0 ? (totalExpense / 30).toFixed(2) : 0)

      const cardWidth = (pageWidth - 28 - 6) / 3
      const cardHeight = 22
      const metrics = [
        { label: 'Total Monthly Expenses', val: formatPdfCurrency(totalExpense), color: [239, 68, 68] },
        { label: 'Daily Average Expense', val: formatPdfCurrency(perDayAvg), color: [99, 102, 241] },
        { label: 'Total Recorded Entries', val: `${expensesList.length} items`, color: [15, 23, 42] }
      ]

      metrics.forEach((m, idx) => {
        const x = 14 + idx * (cardWidth + 3)
        doc.setFillColor(...lightBg)
        doc.setDrawColor(...borderColor)
        doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD')

        doc.setFontSize(7)
        doc.setTextColor(...mutedColor)
        doc.setFont('helvetica', 'normal')
        doc.text(m.label, x + 4, startY + 6)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...m.color)
        doc.text(m.val, x + 4, startY + 16)
      })

      startY += cardHeight + 10

      // ── Category Breakdown Table (Date-Wise Grouped) ──────────────────────
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryColor)
      doc.text('Expense Line Items (Grouped Date-Wise)', 14, startY)
      startY += 4

      const expenseRows = buildGroupedExpenseRows(expensesList)

      autoTable(doc, {
        startY: startY,
        head: [['Date', 'Description / Expense Note', 'Paid Via / Account', 'Amount']],
        body: expenseRows,
        theme: 'striped',
        headStyles: { fillStyle: 'F', fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold', textColor: [239, 68, 68] } },
        margin: { left: 14, right: 14 }
      })
    }

    // ── Page Numbers & Confidentiality Footer ────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setDrawColor(...borderColor)
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...mutedColor)
      doc.text('Accountize Personal Finance • Confidential Financial Statement', 14, pageHeight - 7)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' })
    }

    // ── Save & Track ───────────────────────────────────────────────────────
    const filename = `Accountize_${type.toUpperCase()}_${currentMonth.replace('-', '_')}.pdf`
    doc.save(filename)

    // Trigger analytics event
    analytics.statementExported('pdf', currentMonth)
  } catch (err) {
    console.error('Failed to export PDF statement:', err)
    alert('Failed to generate PDF. Please try again.')
  }
}
