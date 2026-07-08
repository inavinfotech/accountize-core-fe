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
