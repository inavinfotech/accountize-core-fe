import { useState, useEffect, useRef, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { getExpenses, deleteExpense, createExpenses, getSetting, setSetting, updateExpense, getAccountBalances, createTransaction, deleteTransaction } from '../lib/db'
import { formatCurrency, formatDate, getDaysInMonth, exportToCSV } from '../lib/utils'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import InfoButton from '../components/InfoButton'
import {
  Plus, Trash2, Receipt, Calendar, TrendingDown,
  Calculator, Target, Clock, Download,
  ArrowUpDown, Check, GripVertical
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
  const [rearrangeMode, setRearrangeMode] = useState(false)
  const [estimatePerDay, setEstimatePerDay] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [visibleDatesCount, setVisibleDatesCount] = useState(10)
  const [expenseAccounts, setExpenseAccounts] = useState([])
  const [settlementTxn, setSettlementTxn] = useState(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleAccountId, setSettleAccountId] = useState('')
  const [userEditedAmount, setUserEditedAmount] = useState(false)

  const pendingUpdatesRef = useRef({})
  const debounceTimerRef = useRef(null)
  const draggedIdRef = useRef(null)

  const getDefaultDate = () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    if (todayStr === currentMonth) {
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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

  const [prevMonth, setPrevMonth] = useState(currentMonth)

  useEffect(() => {
    const isMonthChange = currentMonth !== prevMonth
    setPrevMonth(currentMonth)
    if (isMonthChange) {
      setVisibleDatesCount(10)
    }
    loadExpenses(!isMonthChange && expenses.length > 0)
  }, [currentMonth, refreshKey])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      const updates = pendingUpdatesRef.current
      if (updates && Object.keys(updates).length > 0) {
        Promise.all(
          Object.entries(updates).map(([id, newCreatedAt]) =>
            updateExpense(id, { created_at: newCreatedAt })
          )
        ).catch(err => console.error('Failed to save pending updates on unmount:', err))
      }
    }
  }, [])

  async function loadExpenses(silent = false) {
    try {
      if (!silent) setLoading(true)
      const data = await getExpenses(currentMonth)
      setExpenses(data)
      const budget = await getSetting('target_per_day_budget', '0')
      setEstimatePerDay(budget)

      // Load expense accounts to check for settlement
      const accountsData = await getAccountBalances(currentMonth)
      const expAccs = accountsData.filter(a => a.subtype === 'expense')
      setExpenseAccounts(expAccs)

      // Find if any expense account has a settlement transaction for this month
      let foundSettlement = null
      for (const acc of expAccs) {
        const t = acc.transactions?.find(tx => tx.description === 'Settle Monthly Expenses')
        if (t) {
          foundSettlement = { ...t, accountName: acc.name }
          break
        }
      }
      setSettlementTxn(foundSettlement)
    } catch (err) {
      console.error('Failed to load expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSettleDate = () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    if (todayStr === currentMonth) {
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    }
    return `${currentMonth}-28`
  }

  async function handleSettle(accountId, amount) {
    try {
      await createTransaction({
        account_id: accountId,
        amount: -amount,
        description: 'Settle Monthly Expenses',
        month_year: currentMonth,
        created_at: new Date(getSettleDate()).toISOString()
      })
      triggerRefresh()
    } catch (err) {
      console.error('Failed to settle monthly expenses:', err)
    }
  }

  async function handleUndoSettle(txnId) {
    try {
      await deleteTransaction(txnId)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to undo settlement:', err)
    }
  }

  const handleExportExpenses = () => {
    const headers = ['Date', 'Amount (₹)', 'Description']
    const rows = expenses.map(e => [
      formatDate(e.date),
      e.amount,
      e.description || ''
    ])
    exportToCSV(`expenses_${currentMonth}.csv`, headers, rows)
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

  const savePendingUpdates = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const updates = pendingUpdatesRef.current
    if (Object.keys(updates).length === 0) return

    pendingUpdatesRef.current = {}

    try {
      await Promise.all(
        Object.entries(updates).map(([id, newCreatedAt]) =>
          updateExpense(id, { created_at: newCreatedAt })
        )
      )
      triggerRefresh()
    } catch (err) {
      console.error('Failed to save rearranged expenses:', err)
      loadExpenses()
    }
  }

  const handleSwapExpenses = (date, id1, id2) => {
    if (id1 === id2) return
    const dateExpenses = expenses.filter(e => e.date === date)
    const index1 = dateExpenses.findIndex(e => e.id === id1)
    const index2 = dateExpenses.findIndex(e => e.id === id2)
    if (index1 === -1 || index2 === -1) return

    // Reorder the array locally (placing item1 at the position of item2)
    const reorderedDateExpenses = [...dateExpenses]
    const [movedItem] = reorderedDateExpenses.splice(index1, 1)
    reorderedDateExpenses.splice(index2, 0, movedItem)

    // Original sorted timestamps (ensuring they are strictly increasing)
    const originalTimestamps = dateExpenses.map(e => new Date(e.created_at).getTime())
    
    // Ensure strictly increasing order
    for (let i = 1; i < originalTimestamps.length; i++) {
      if (originalTimestamps[i] <= originalTimestamps[i - 1]) {
        originalTimestamps[i] = originalTimestamps[i - 1] + 1000
      }
    }
    
    // Convert back to ISO string
    const originalTimestampsISO = originalTimestamps.map(t => new Date(t).toISOString())

    // Map each item in the reordered list to its new timestamp
    const updates = {}
    const updatedExpenses = expenses.map(e => {
      if (e.date !== date) return e

      // Find the index of this item in the reordered list
      const newIdx = reorderedDateExpenses.findIndex(item => item.id === e.id)
      if (newIdx === -1) return e
      
      const newCreatedAt = originalTimestampsISO[newIdx]

      if (e.created_at !== newCreatedAt) {
        updates[e.id] = newCreatedAt
        return { ...e, created_at: newCreatedAt }
      }
      return e
    })
    
    // Sort local expenses
    const sorted = [...updatedExpenses].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date)
      if (dateDiff !== 0) return dateDiff
      return new Date(a.created_at) - new Date(b.created_at)
    })
    setExpenses(sorted)

    // Store in pending updates
    Object.entries(updates).forEach(([id, newCreatedAt]) => {
      pendingUpdatesRef.current[id] = newCreatedAt
    })

    // Debounce save to database (3 seconds)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      savePendingUpdates()
    }, 3500)
  }

  // ===== Analytics (matching Excel formulas) =====
  const {
    totalSpend,
    uniqueDays,
    perDayAvg,
    daysInMonth,
    monthEstimate,
    customEstimatePerDay,
    customEstimateTotal,
    overrun,
    chartData,
    groupedByDate,
    sortedDates
  } = useMemo(() => {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const days = new Set(expenses.map(e => e.date)).size
    const avg = days > 0 ? total / days : 0
    const daysInMonth = getDaysInMonth(currentMonth)
    const est = avg * daysInMonth

    // Current estimate using custom per-day value (like Excel's K46)
    const customEstPerDay = parseFloat(estimatePerDay) || 0
    const customEstTotal = customEstPerDay * daysInMonth
    const over = total - (customEstPerDay * days)

    // Group by date for chart
    const byDate = {}
    expenses.forEach(e => {
      const day = parseInt(e.date.split('-')[2], 10)
      byDate[day] = (byDate[day] || 0) + e.amount
    })

    // Cumulative chart
    let cumulative = 0
    const chart = Object.entries(byDate)
      .sort(([a], [b]) => a - b)
      .map(([day, amount]) => {
        cumulative += amount
        return { day: parseInt(day), daily: amount, cumulative }
      })

    // Group expenses by date for list display
    const grouped = {}
    expenses.forEach(e => {
      const key = e.date
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(e)
    })
    const sorted = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a))

    return {
      totalSpend: total,
      uniqueDays: days,
      perDayAvg: avg,
      daysInMonth,
      monthEstimate: est,
      customEstimatePerDay: customEstPerDay,
      customEstimateTotal: customEstTotal,
      overrun: over,
      chartData: chart,
      groupedByDate: grouped,
      sortedDates: sorted
    }
  }, [expenses, currentMonth, estimatePerDay])

  useEffect(() => {
    setUserEditedAmount(false)
    setSettleAmount('')
    setSettleAccountId('')
  }, [currentMonth])

  useEffect(() => {
    if (!userEditedAmount && totalSpend !== undefined) {
      setSettleAmount(totalSpend.toString())
    }
  }, [totalSpend, userEditedAmount])

  useEffect(() => {
    if (expenseAccounts.length > 0 && !settleAccountId) {
      setSettleAccountId(expenseAccounts[0].id)
    }
  }, [expenseAccounts, settleAccountId])

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
          <div className="stat-card-label">
            Total Spent
            <InfoButton metricId="totalExpenses" contextValues={{ totalExpenses: totalSpend }} />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--red)' }}>
            {formatCurrency(totalSpend)}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-icon blue"><Calculator size={20} /></div>
          <div className="stat-card-label">
            Per Day Average
            <InfoButton metricId="perDayAvg" contextValues={{ totalExpenses: totalSpend, daysTracked: uniqueDays }} />
          </div>
          <div className="stat-card-value">{formatCurrency(perDayAvg)}</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-card-icon purple"><Clock size={20} /></div>
          <div className="stat-card-label">
            Days Tracked
            <InfoButton metricId="daysTracked" contextValues={{ daysTracked: uniqueDays }} />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--purple)' }}>
            {uniqueDays} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {daysInMonth}</span>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-icon amber"><Target size={20} /></div>
          <div className="stat-card-label">
            Month Estimate
            <InfoButton metricId="monthEstimate" contextValues={{ perDayAvg, daysInMonth }} />
          </div>
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
          <BudgetInput
            value={estimatePerDay}
            customEstimatePerDay={customEstimatePerDay}
            onSave={async (val) => {
              setEstimatePerDay(val)
              await setSetting('target_per_day_budget', val)
            }}
          />
          {customEstimatePerDay > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Value / Day
                  <InfoButton metricId="targetPerDayBudget" contextValues={{ customEstimatePerDay }} />
                </span>
                <span className="amount" style={{ color: 'var(--blue)' }}>
                  {formatCurrency(customEstimatePerDay)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Value / Day × {daysInMonth} days
                  <InfoButton metricId="customEstimateTotal" contextValues={{ customEstimatePerDay, daysInMonth }} />
                </span>
                <span className="amount" style={{ color: 'var(--amber)' }}>
                  {formatCurrency(customEstimateTotal)}
                </span>
              </div>
              <div className="divider" style={{ margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Overrun (spent - budget for {uniqueDays} days)
                  <InfoButton metricId="overrun" contextValues={{ totalSpend, customEstimatePerDay, uniqueDays }} />
                </span>
                <span className={`amount ${overrun > 0 ? 'negative' : 'positive'}`}>
                  {formatCurrency(overrun)}
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
          <div className="divider" style={{ margin: '16px 0 12px 0' }} />
          {expenseAccounts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Month-End Settlement</span>
                {settlementTxn ? (
                  <span className="badge green" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Settled</span>
                ) : (
                  <span className="badge red" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Pending</span>
                )}
              </div>
              {settlementTxn ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Subtracted {formatCurrency(Math.abs(settlementTxn.amount))} from {settlementTxn.accountName}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleUndoSettle(settlementTxn.id)}
                    style={{ color: 'var(--red)', fontWeight: 600, padding: '2px 6px', height: 'auto', fontSize: '0.75rem' }}
                  >
                    Undo
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 2 }}>Account</label>
                    <select
                      className="form-input form-input-sm"
                      value={settleAccountId}
                      onChange={e => setSettleAccountId(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto' }}
                    >
                      {expenseAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 2 }}>Amount to Subtract (₹)</label>
                    <input
                      type="number"
                      className="form-input form-input-sm"
                      value={settleAmount}
                      onChange={e => {
                        setSettleAmount(e.target.value)
                        setUserEditedAmount(true)
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto' }}
                    />
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSettle(settleAccountId, parseFloat(settleAmount) || 0)}
                    disabled={!settleAccountId || (parseFloat(settleAmount) || 0) <= 0}
                    style={{ alignSelf: 'flex-start', fontWeight: 600, fontSize: '0.75rem', padding: '6px 10px', marginTop: 4 }}
                  >
                    Settle Expenses
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Month-End Settlement</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                No expense pool account found (e.g. Expence Money). Create one in the Accounts tab to enable settlement.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expenses Grid Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">All Expenses</div>
            <div className="badge purple" style={{ marginTop: 4 }}>{expenses.length} entries</div>
          </div>
          {expenses.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm btn-mobile-icon"
                type="button"
                onClick={handleExportExpenses}
                title="Export CSV"
              >
                <Download size={14} /> <span className="btn-text">Export CSV</span>
              </button>
              <button
                className={`btn btn-sm btn-mobile-icon ${rearrangeMode ? 'btn-primary' : 'btn-secondary'}`}
                type="button"
                onClick={() => {
                  if (rearrangeMode) {
                    savePendingUpdates()
                  }
                  setRearrangeMode(!rearrangeMode)
                }}
                title={rearrangeMode ? 'Done Rearranging' : 'Rearrange Sequence'}
              >
                {rearrangeMode ? <Check size={14} /> : <ArrowUpDown size={14} />}
                <span className="btn-text">{rearrangeMode ? 'Done Rearranging' : 'Rearrange Sequence'}</span>
              </button>
            </div>
          )}
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
            {sortedDates.slice(0, visibleDatesCount).map(date => {
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
                    {dateExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className={`transaction-pill debit ${rearrangeMode ? 'draggable' : ''} ${draggedId === expense.id ? 'dragged' : ''} ${dragOverId === expense.id ? 'drag-over' : ''}`}
                        draggable={rearrangeMode}
                        onDragStart={(e) => {
                          if (!rearrangeMode) return
                          draggedIdRef.current = expense.id
                          setDraggedId(expense.id)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', expense.id)
                        }}
                        onDragEnd={() => {
                          draggedIdRef.current = null
                          setDraggedId(null)
                          setDragOverId(null)
                        }}
                        onDragOver={(e) => {
                          if (!rearrangeMode) return
                          e.preventDefault()
                        }}
                        onDragEnter={() => {
                          if (!rearrangeMode || !draggedIdRef.current) return
                          const draggedExpense = expenses.find(x => x.id === draggedIdRef.current)
                          if (draggedExpense && draggedExpense.date === date && expense.id !== draggedIdRef.current) {
                            setDragOverId(expense.id)
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverId === expense.id) {
                            setDragOverId(null)
                          }
                        }}
                        onDrop={(e) => {
                          if (!rearrangeMode) return
                          e.preventDefault()
                          const srcId = e.dataTransfer.getData('text/plain') || draggedIdRef.current
                          if (srcId && srcId !== expense.id) {
                            handleSwapExpenses(date, srcId, expense.id)
                          }
                          draggedIdRef.current = null
                          setDraggedId(null)
                          setDragOverId(null)
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.05)',
                          borderColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {rearrangeMode && (
                          <GripVertical 
                            size={12} 
                            style={{ 
                              cursor: 'grab', 
                              opacity: 0.6,
                              marginRight: -2,
                              flexShrink: 0
                            }} 
                          />
                        )}

                        <span style={{ fontWeight: 600 }}>{formatCurrency(expense.amount)}</span>
                        {expense.description && (
                          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}> · {expense.description}</span>
                        )}

                        {!rearrangeMode && (
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
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {visibleDatesCount < sortedDates.length && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={() => setVisibleDatesCount(prev => prev + 10)}
                  style={{ width: '100%', maxWidth: '200px', fontWeight: 600 }}
                >
                  Load More Dates
                </button>
              </div>
            )}
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

function BudgetInput({ value, customEstimatePerDay, onSave }) {
  const [localVal, setLocalVal] = useState(value)

  useEffect(() => {
    setLocalVal(value)
  }, [value])

  return (
    <div className="form-group">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Target per day budget (₹)
        <InfoButton metricId="targetPerDayBudget" contextValues={{ customEstimatePerDay }} />
      </label>
      <input
        className="form-input"
        type="number"
        placeholder="e.g., 248"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={() => {
          if (localVal !== value) {
            onSave(localVal)
          }
        }}
      />
    </div>
  )
}
