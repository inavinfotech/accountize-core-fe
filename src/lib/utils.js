export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '₹0.00'
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
  return `₹${formatted}`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  // Handle date-only strings without timezone offset shifting
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatTransactionCreatedAt(dateStr, existingCreatedAt) {
  if (!dateStr) return new Date().toISOString()
  const today = new Date()

  let h = today.getHours()
  let m = today.getMinutes()
  let s = today.getSeconds()
  let ms = today.getMilliseconds()

  if (existingCreatedAt) {
    const existing = new Date(existingCreatedAt)
    if (!isNaN(existing.getTime())) {
      h = existing.getHours()
      m = existing.getMinutes()
      s = existing.getSeconds()
      ms = existing.getMilliseconds()
    }
  }

  if (typeof dateStr === 'string') {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts
      const d = new Date(year, month - 1, day, h, m, s, ms)
      return d.toISOString()
    }
  }

  return new Date(dateStr).toISOString()
}

export function formatFullDate(dateStr) {
  return formatDate(dateStr)
}

export function getMonthOptions() {
  const months = []
  const now = new Date()
  for (let i = 12; i >= -2; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    months.push({ value, label })
  }
  return months
}

export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getDaysInMonth(monthYear) {
  const [year, month] = monthYear.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function getAmountClass(amount, type) {
  if (type === 'payable') {
    return 'negative'
  }
  if (type === 'receivable') {
    return 'positive'
  }
  if (type === 'payable-txn') {
    return amount > 0 ? 'negative' : amount < 0 ? 'positive' : ''
  }
  if (type === 'receivable-txn') {
    return amount > 0 ? 'positive' : amount < 0 ? 'negative' : ''
  }
  if (amount > 0) return 'positive'
  if (amount < 0) return 'negative'
  return ''
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function exportToCSV(filename, headers, rows) {
  const content = [
    headers.join(','),
    ...rows.map(r => r.map(val => {
      const stringVal = val === null || val === undefined ? '' : String(val)
      return `"${stringVal.replace(/"/g, '""')}"`
    }).join(','))
  ].join('\n')
  
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Safely evaluates user math input (e.g. "200+150+50") and triggers math_split_used analytics event
 */
export function parseMathExpression(inputVal, analyticsRef) {
  if (inputVal === null || inputVal === undefined) return 0
  const str = String(inputVal).trim()
  if (!str) return 0

  // Check if string contains math operators (+, -, *, /)
  const hasOperators = /[+\-*/]/.test(str)

  try {
    const cleaned = str.replace(/[^0-9+\-*/.]/g, '')
    if (!cleaned) return 0
    // eslint-disable-next-line no-eval
    const result = Function(`"use strict"; return (${cleaned})`)()
    if (typeof result === 'number' && !isNaN(result)) {
      if (hasOperators && analyticsRef?.mathSplitUsed) {
        analyticsRef.mathSplitUsed(str, result)
      }
      return result
    }
  } catch {
    // Return numeric fallback on parse error
  }
  return parseFloat(str) || 0
}

