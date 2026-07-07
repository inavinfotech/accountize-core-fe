import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { getDashboardData, getSetting, createTransaction } from '../lib/db'
import { formatCurrency, getAmountClass, getDaysInMonth, exportToCSV } from '../lib/utils'
import InfoButton from '../components/InfoButton'
import {
  Wallet, TrendingUp, TrendingDown, Banknote, CreditCard,
  ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, PiggyBank, Download
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts'

const PIE_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function Dashboard() {
  const { currentMonth, refreshKey, triggerRefresh } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dailyBudget, setDailyBudget] = useState(0)
  const [prevMonth, setPrevMonth] = useState(currentMonth)

  useEffect(() => {
    const isMonthChange = currentMonth !== prevMonth
    setPrevMonth(currentMonth)
    loadData(!isMonthChange && data !== null)
  }, [currentMonth, refreshKey])

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true)
      const d = await getDashboardData(currentMonth)
      setData(d)
      const budget = await getSetting('target_per_day_budget', '0')
      setDailyBudget(parseFloat(budget) || 0)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const daysInMonth = getDaysInMonth(currentMonth)

  const {
    estimatedMonthly,
    hasManualData,
    verified,
    faultAmount,
    chartData,
    pieData
  } = useMemo(() => {
    if (!data) {
      return {
        estimatedMonthly: 0,
        hasManualData: false,
        verified: true,
        faultAmount: 0,
        chartData: [],
        pieData: []
      }
    }
    const est = data.perDayAvg * daysInMonth
    const manualData = data.summary && ((data.summary.manual_balance || 0) > 0 || (data.summary.manual_cash || 0) > 0)
    const manualCashVal = data.summary?.manual_cash || 0
    const manualOnlineVal = data.summary ? (data.summary.manual_balance || 0) - manualCashVal : 0

    const isOnlineVerified = manualOnlineVal <= 0 || Math.abs(data.onlineBalance - manualOnlineVal) < 0.01
    const isCashVerified = manualCashVal <= 0 || Math.abs(data.cashBalance - manualCashVal) < 0.01

    const isVerified = !manualData || (isOnlineVerified && isCashVerified)
    
    let fault = 0
    if (!isOnlineVerified) fault += Math.abs(data.onlineBalance - manualOnlineVal)
    if (!isCashVerified) fault += Math.abs(data.cashBalance - manualCashVal)

    // Chart data for daily expenses
    const expenseByDate = {}
    data.expenses.forEach(e => {
      const dateKey = e.date
      expenseByDate[dateKey] = (expenseByDate[dateKey] || 0) + e.amount
    })
    const chart = Object.entries(expenseByDate).map(([date, amount]) => {
      const day = parseInt(date.split('-')[2], 10)
      return {
        date: day,
        amount
      }
    }).sort((a, b) => a.date - b.date)

    // Pie data for receivables
    const pie = data.receivables
      .filter(a => a.balance > 0)
      .map(a => ({ name: a.name, value: a.balance }))

    return {
      estimatedMonthly: est,
      hasManualData: manualData,
      verified: isVerified,
      faultAmount: fault,
      chartData: chart,
      pieData: pie
    }
  }, [data, currentMonth, daysInMonth])

  const expenseAccounts = useMemo(() => {
    if (!data) return []
    return data.balances.filter(a => a.subtype === 'expense')
  }, [data])

  const settlementTxn = useMemo(() => {
    if (!data || expenseAccounts.length === 0) return null
    return expenseAccounts.reduce((found, acc) => {
      if (found) return found
      const t = acc.transactions?.find(tx => tx.description === 'Settle Monthly Expenses')
      return t ? { ...t, accountName: acc.name } : null
    }, null)
  }, [data, expenseAccounts])

  const showSettlementWarning = useMemo(() => {
    if (!data || data.totalExpenses <= 0 || settlementTxn || expenseAccounts.length === 0) return false

    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth() + 1
    const todayMonthStr = `${todayYear}-${String(todayMonth).padStart(2, '0')}`

    if (currentMonth < todayMonthStr) {
      // Past month is fully complete and unsettled, show warning
      return true
    }
    if (currentMonth > todayMonthStr) {
      // Future month, don't show warning
      return false
    }

    // Current month: show warning only when 1 day or less remains to month complete
    const lastDay = new Date(todayYear, todayMonth, 0).getDate()
    const currentDay = today.getDate()
    const daysRemaining = lastDay - currentDay
    return daysRemaining <= 1
  }, [data, settlementTxn, expenseAccounts, currentMonth])

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
      console.error('Failed to settle expenses from dashboard:', err)
    }
  }

  const handleExportMonthlySummary = () => {
    if (!data) return
    const headers = ['Category', 'Item/Account', 'Amount / Balance (₹)', 'Type']
    const rows = [
      ['Summary', 'Total Assets', data.totalAssets, 'Asset'],
      ['Summary', 'Total Liabilities', data.totalPayables, 'Liability'],
      ['Summary', 'Net Available Balance', data.availableBalance, 'Net Balance'],
      ['Summary', 'Cash Balance', data.cashBalance, 'Self'],
      ['Summary', 'Online Balance', data.onlineBalance, 'Self'],
      ['Summary', 'Bank Balance', data.bankBalance, 'Self'],
      ['Summary', 'Monthly Spend Total', data.totalExpenses, 'Spend'],
      ['Summary', 'Daily Avg Spend', data.perDayAvg, 'Spend'],
      [],
      ['Account Details', 'Name', 'Balance (₹)', 'Type']
    ]
    
    data.balances.forEach(acc => {
      rows.push(['Account Details', acc.name, acc.balance, acc.type])
    })
    
    exportToCSV(`monthly_summary_${currentMonth}.csv`, headers, rows)
  }

  if (loading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Financial overview for the month</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: 40, height: 40, marginBottom: 14 }} />
              <div className="skeleton" style={{ width: 80, height: 12, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 28 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Your financial overview at a glance</p>
        </div>
        {data && (
          <button
            className="btn btn-secondary btn-sm btn-mobile-icon"
            type="button"
            onClick={handleExportMonthlySummary}
            title="Export Backup"
          >
            <Download size={14} /> <span className="btn-text">Export Backup</span>
          </button>
        )}
      </div>

      {/* Pending Settlement Banner */}
      {showSettlementWarning && (
        <div className="verification-banner" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--amber)', marginBottom: 20 }}>
          <div className="verification-banner-icon" style={{ color: 'var(--amber)' }}>
            <ShieldAlert size={22} />
          </div>
          <div className="verification-banner-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', width: '100%', gap: 12 }}>
            <div>
              <h3 style={{ color: 'var(--amber)', margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600 }}>Unsettled Expenses</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
                You have {formatCurrency(data.totalExpenses)} of expenses that haven't been subtracted from your expense account ({expenseAccounts[0].name}) yet.
              </p>
            </div>
            <button
              onClick={() => handleSettle(expenseAccounts[0].id, data.totalExpenses)}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--amber)',
                color: 'var(--amber)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              Settle Now
            </button>
          </div>
        </div>
      )}

      {/* Verification Banner */}
      {data.summary && !verified && (
        <div className={`verification-banner fail`}>
          <div className="verification-banner-icon">
            <ShieldAlert size={22} />
          </div>
          <div className="verification-banner-text">
            <h3>Verification Failed</h3>
            <p>
              Discrepancy of {formatCurrency(faultAmount)} found. Please review your entries.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-card-icon green"><Wallet size={20} /></div>
          <div className="stat-card-label">
            Available Balance
            <InfoButton metricId="availableBalance" contextValues={data} />
          </div>
          <div className={`stat-card-value ${getAmountClass(data.availableBalance)}`}>
            {formatCurrency(data.availableBalance)}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-icon blue"><TrendingUp size={20} /></div>
          <div className="stat-card-label">
            Total Receivables
            <InfoButton metricId="totalReceivables" contextValues={data} />
          </div>
          <div className="stat-card-value positive">
            {formatCurrency(data.totalReceivables)}
          </div>
        </div>

        <div className="stat-card red">
          <div className="stat-card-icon red"><TrendingDown size={20} /></div>
          <div className="stat-card-label">
            Total Payables
            <InfoButton metricId="totalPayables" contextValues={data} />
          </div>
          <div className="stat-card-value negative">
            {formatCurrency(data.totalPayables)}
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-icon amber"><Banknote size={20} /></div>
          <div className="stat-card-label">
            Cash in Hand
            <InfoButton metricId="cashBalance" contextValues={data} />
          </div>
          <div className="stat-card-value">{formatCurrency(data.cashBalance)}</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-card-icon purple"><CreditCard size={20} /></div>
          <div className="stat-card-label">
            Online Balance
            <InfoButton metricId="onlineBalance" contextValues={data} />
          </div>
          <div className="stat-card-value">{formatCurrency(data.onlineBalance)}</div>
        </div>

        <div className="stat-card indigo">
          <div className="stat-card-icon indigo"><PiggyBank size={20} /></div>
          <div className="stat-card-label">
            Other Banks
            <InfoButton metricId="bankBalance" contextValues={data} />
          </div>
          <div className="stat-card-value">{formatCurrency(data.bankBalance)}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="two-col-grid mb-24">
        {/* Daily Expenses Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                Daily Expenses
                <InfoButton metricId="dailyExpenses" contextValues={data} />
              </div>
              <div className="card-subtitle">Spending trend this month</div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f36',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 13
                  }}
                  formatter={(value) => [formatCurrency(value), 'Spent']}
                />
                <Bar dataKey="amount" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                {dailyBudget > 0 && (
                  <ReferenceLine
                    y={dailyBudget}
                    stroke="#ef4444"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    label={{
                      value: `Budget ₹${dailyBudget}`,
                      position: 'right',
                      fill: '#ef4444',
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  />
                )}
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No expense data for this month yet</p>
            </div>
          )}
        </div>

        {/* Receivables Pie Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                Receivables Breakdown
                <InfoButton metricId="receivablesBreakdown" contextValues={data} />
              </div>
              <div className="card-subtitle">Who owes you money</div>
            </div>
          </div>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 8px' }}>
              <div style={{ width: '45%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1a1f36',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#f1f5f9',
                        fontSize: 13
                      }}
                      formatter={(value) => [formatCurrency(value), 'Balance']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ width: '55%', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                {pieData.map((item, idx) => {
                  const total = pieData.reduce((sum, d) => sum + d.value, 0)
                  const percent = total > 0 ? (item.value / total) * 100 : 0
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                          flexShrink: 0
                        }} />
                        <span style={{
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          fontWeight: 500,
                          color: 'var(--text-color)'
                        }} title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No receivables to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Expense Analytics */}
      <div className="card mb-24">
        <div className="card-header">
          <div>
            <div className="card-title">Expense Analytics</div>
            <div className="card-subtitle">Estimate Finder — matching your Excel formulas</div>
          </div>
        </div>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div style={{ padding: '12px 0' }}>
            <div className="stat-card-label">
              Total Spent
              <InfoButton metricId="totalExpenses" contextValues={data} />
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--red)' }}>
              {formatCurrency(data.totalExpenses)}
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            <div className="stat-card-label">
              Per Day Average
              <InfoButton metricId="perDayAvg" contextValues={data} />
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
              {formatCurrency(data.perDayAvg)}
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            <div className="stat-card-label">
              Days Tracked
              <InfoButton metricId="daysTracked" contextValues={data} />
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--blue)' }}>
              {data.daysTracked} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {daysInMonth}</span>
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            <div className="stat-card-label">
              Monthly Estimate
              <InfoButton metricId="monthEstimate" contextValues={data} />
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--amber)' }}>
              {formatCurrency(estimatedMonthly)}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="two-col-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Receivables</div>
          </div>
          {data.receivables.filter(a => a.balance > 0).length > 0 ? (
            data.receivables
              .filter(a => a.balance > 0)
              .sort((a, b) => b.balance - a.balance)
              .slice(0, 5)
              .map(account => (
                <div key={account.id} className="expense-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ArrowUpRight size={16} color="var(--green)" />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{account.name}</span>
                  </div>
                  <span className="amount positive">{formatCurrency(account.balance)}</span>
                </div>
              ))
          ) : (
            <div className="empty-state"><p>No receivables</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Payables</div>
          </div>
          {data.payables.filter(a => a.balance > 0).length > 0 ? (
            data.payables
              .filter(a => a.balance > 0)
              .sort((a, b) => b.balance - a.balance)
              .slice(0, 5)
              .map(account => (
                <div key={account.id} className="expense-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ArrowDownRight size={16} color="var(--red)" />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{account.name}</span>
                  </div>
                  <span className="amount negative">{formatCurrency(account.balance)}</span>
                </div>
              ))
          ) : (
            <div className="empty-state"><p>No payables</p></div>
          )}
        </div>
      </div>
    </div>
  )
}
