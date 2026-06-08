import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getExpenses, deleteExpense, createExpenses, getSetting, setSetting } from '../lib/db'
import { formatCurrency, formatDate, getDaysInMonth } from '../lib/utils'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import {
  Plus, Trash2, Receipt, Calendar, TrendingDown,
  Calculator, Target, Clock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function Expenses() {
  const { currentMonth, refreshKey, triggerRefresh } = useApp()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newExpenses, setNewExpenses] = useState([])
  const [estimatePerDay, setEstimatePerDay] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const getDefaultDate = () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    if (todayStr === currentMonth) {
      return today.toISOString().split('T')[0]
    }
    return `${currentMonth}-01`
  }

  const handleOpenAdd = () => {
    setNewExpenses([{ date: getDefaultDate(), amount: '', description: '' }])
    setShowAdd(true)
  }

  const handleAddRow = () => {
    const lastDate = newExpenses.length > 0 ? newExpenses[newExpenses.length - 1].date : getDefaultDate()
    setNewExpenses([...newExpenses, { date: lastDate, amount: '', description: '' }])
  }

  const handleRemoveRow = (index) => {
    setNewExpenses(newExpenses.filter((_, i) => i !== index))
  }

  const handleUpdateRow = (index, field, value) => {
    const updated = [...newExpenses]
    updated[index] = { ...updated[index], [field]: value }
    setNewExpenses(updated)
  }

  const handleAmountBlur = (index, value) => {
    if (!value) return
    const strVal = String(value)
    if (strVal.includes('+')) {
      const parts = strVal.split('+').map(p => p.trim()).filter(p => p && !isNaN(p))
      if (parts.length > 1) {
        setNewExpenses(prev => {
          const updated = [...prev]
          const currentRow = { ...updated[index], amount: parts[0] }
          updated[index] = currentRow
          
          const newRows = parts.slice(1).map(part => ({
            date: currentRow.date,
            amount: part,
            description: currentRow.description
          }))
          
          updated.splice(index + 1, 0, ...newRows)
          return updated
        })
      }
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [currentMonth, refreshKey])

  async function loadExpenses() {
    try {
      setLoading(true)
      const data = await getExpenses(currentMonth)
      setExpenses(data)
      const budget = await getSetting('target_per_day_budget', '248')
      setEstimatePerDay(budget)
    } catch (err) {
      console.error('Failed to load expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    try {
      const expandedExpenses = []
      newExpenses.forEach(item => {
        const value = String(item.amount)
        if (value.includes('+')) {
          const parts = value.split('+').map(p => p.trim()).filter(p => p && !isNaN(p))
          parts.forEach(part => {
            expandedExpenses.push({
              date: item.date,
              amount: parseFloat(part),
              description: item.description,
              month_year: currentMonth,
            })
          })
        } else {
          const parsed = parseFloat(item.amount)
          if (!isNaN(parsed)) {
            expandedExpenses.push({
              date: item.date,
              amount: parsed,
              description: item.description,
              month_year: currentMonth,
            })
          }
        }
      })

      if (expandedExpenses.length === 0) return

      await createExpenses(expandedExpenses)
      setNewExpenses([])
      setShowAdd(false)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to create expenses:', err)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteExpense(id)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to delete expense:', err)
    }
  }

  // ===== Analytics (matching Excel formulas) =====
  const totalSpend = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const uniqueDays = new Set(expenses.map(e => e.date)).size
  const perDayAvg = uniqueDays > 0 ? totalSpend / uniqueDays : 0
  const daysInMonth = getDaysInMonth(currentMonth)
  const monthEstimate = perDayAvg * daysInMonth

  // Current estimate using custom per-day value (like Excel's K46)
  const customEstimatePerDay = parseFloat(estimatePerDay) || 0
  const customEstimateTotal = customEstimatePerDay * daysInMonth
  const overrun = totalSpend - (customEstimatePerDay * uniqueDays)

  // Group by date for chart
  const byDate = {}
  expenses.forEach(e => {
    const day = new Date(e.date).getDate()
    byDate[day] = (byDate[day] || 0) + e.amount
  })

  // Cumulative chart
  let cumulative = 0
  const chartData = Object.entries(byDate)
    .sort(([a], [b]) => a - b)
    .map(([day, amount]) => {
      cumulative += amount
      return { day: parseInt(day), daily: amount, cumulative }
    })

  // Group expenses by date for list display
  const groupedByDate = {}
  expenses.forEach(e => {
    const key = e.date
    if (!groupedByDate[key]) groupedByDate[key] = []
    groupedByDate[key].push(e)
  })
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a))

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Expenses</h2>
          <p>Track daily spending and analyze patterns</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="stats-grid">
        <div className="stat-card red">
          <div className="stat-card-icon red"><TrendingDown size={20} /></div>
          <div className="stat-card-label">Total Spent</div>
          <div className="stat-card-value" style={{ color: 'var(--red)' }}>
            {formatCurrency(totalSpend)}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-icon blue"><Calculator size={20} /></div>
          <div className="stat-card-label">Per Day Average</div>
          <div className="stat-card-value">{formatCurrency(perDayAvg)}</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-card-icon purple"><Clock size={20} /></div>
          <div className="stat-card-label">Days Tracked</div>
          <div className="stat-card-value" style={{ color: 'var(--purple)' }}>
            {uniqueDays} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {daysInMonth}</span>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-icon amber"><Target size={20} /></div>
          <div className="stat-card-label">Month Estimate</div>
          <div className="stat-card-value" style={{ color: 'var(--amber)' }}>
            {formatCurrency(monthEstimate)}
          </div>
        </div>
      </div>

      {/* Chart + Estimate Finder */}
      <div className="two-col-grid mb-24">
        {/* Cumulative Spending Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Spending Trend</div>
              <div className="card-subtitle">Cumulative daily spending</div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f36',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 13
                  }}
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name === 'cumulative' ? 'Total' : 'Daily'
                  ]}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#ef4444" fillOpacity={1} fill="url(#areaGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No expense data yet</p></div>
          )}
        </div>

        {/* Estimate Finder (matches Excel K45-K48 section) */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Estimate Finder</div>
              <div className="card-subtitle">Custom budget estimation like your Excel</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Target per day budget (₹)</label>
            <input
              className="form-input"
              type="number"
              placeholder="e.g., 248"
              value={estimatePerDay}
              onChange={e => setEstimatePerDay(e.target.value)}
              onBlur={async () => {
                await setSetting('target_per_day_budget', estimatePerDay)
              }}
            />
          </div>
          {customEstimatePerDay > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Value / Day</span>
                <span className="amount" style={{ color: 'var(--blue)' }}>
                  {formatCurrency(customEstimatePerDay)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Value / Day × {daysInMonth} days</span>
                <span className="amount" style={{ color: 'var(--amber)' }}>
                  {formatCurrency(customEstimateTotal)}
                </span>
              </div>
              <div className="divider" style={{ margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Overrun (spent - budget for {uniqueDays} days)
                </span>
                <span className={`amount ${overrun > 0 ? 'negative' : 'positive'}`}>
                  {overrun > 0 ? '+' : ''}{formatCurrency(overrun)}
                </span>
              </div>
              <div
                className={`badge ${overrun > 0 ? 'red' : 'green'}`}
                style={{ alignSelf: 'flex-start' }}
              >
                {overrun > 0 ? 'Over Budget' : 'Under Budget'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expenses Grid Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">All Expenses</div>
          <div className="badge purple">{expenses.length} entries</div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={{ height: 44 }} />
            ))}
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="empty-state">
            <Receipt size={48} />
            <h3>No expenses recorded</h3>
            <p>Start tracking your daily spending</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sortedDates.map(date => {
              const dateExpenses = groupedByDate[date]
              const dayTotal = dateExpenses.reduce((s, e) => s + e.amount, 0)
              return (
                <div key={date} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                  {/* Date Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {formatDate(date)}
                      </span>
                    </div>
                    <span className="amount negative" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {formatCurrency(dayTotal)}
                    </span>
                  </div>

                  {/* Pills Container */}
                  <div className="transaction-pills">
                    {dateExpenses.map(expense => (
                      <div
                        key={expense.id}
                        className="transaction-pill debit"
                        style={{
                          background: 'rgba(239, 68, 68, 0.05)',
                          borderColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{formatCurrency(expense.amount)}</span>
                        {expense.description && (
                          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}> · {expense.description}</span>
                        )}
                        <button
                          onClick={() => setDeleteConfirm({
                            id: expense.id,
                            amount: expense.amount,
                            description: expense.description
                          })}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0 2px',
                            color: 'inherit',
                            opacity: 0.6,
                            marginLeft: 4,
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}
                          title="Delete Expense"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAdd && (
        <Modal title="Add Expenses" onClose={() => setShowAdd(false)} size="large">
          <form onSubmit={handleAdd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>
              {newExpenses.map((expense, index) => (
                <div key={index} className="expense-row-grid animate-in">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date</label>
                    <input
                      className="form-input"
                      type="date"
                      value={expense.date}
                      onChange={e => handleUpdateRow(index, 'date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Amount (₹)</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g., 250 or 10+20+15"
                      value={expense.amount}
                      onChange={e => handleUpdateRow(index, 'amount', e.target.value)}
                      onBlur={e => handleAmountBlur(index, e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description (optional)</label>
                    <input
                      className="form-input"
                      placeholder="e.g., Food, Transport..."
                      value={expense.description}
                      onChange={e => handleUpdateRow(index, 'description', e.target.value)}
                    />
                  </div>
                  {newExpenses.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => handleRemoveRow(index)}
                      style={{ height: 38, width: 38, flexShrink: 0, alignSelf: 'flex-end' }}
                      title="Remove Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddRow}>
                <Plus size={14} /> Add Row
              </button>
              
              <div className="modal-actions" style={{ marginTop: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expenses</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Delete Expense?"
          message={`Are you sure you want to delete the expense of ${formatCurrency(deleteConfirm.amount)} ${deleteConfirm.description ? `("${deleteConfirm.description}")` : ''}? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
