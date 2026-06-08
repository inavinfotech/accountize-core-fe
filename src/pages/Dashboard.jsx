import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getDashboardData } from '../lib/db'
import { formatCurrency, getAmountClass, getDaysInMonth } from '../lib/utils'
import {
  Wallet, TrendingUp, TrendingDown, Banknote, CreditCard,
  ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, PiggyBank
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const PIE_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function Dashboard() {
  const { currentMonth, refreshKey } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [currentMonth, refreshKey])

  async function loadData() {
    try {
      setLoading(true)
      const d = await getDashboardData(currentMonth)
      setData(d)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
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

  const daysInMonth = getDaysInMonth(currentMonth)
  const estimatedMonthly = data.perDayAvg * daysInMonth
  // Dynamically compute verification status using current database balances and saved manual entries to prevent stale database state
  const hasManualData = data.summary && ((data.summary.manual_balance || 0) > 0 || (data.summary.manual_cash || 0) > 0)
  const manualCashVal = data.summary?.manual_cash || 0
  const manualOnlineVal = data.summary ? (data.summary.manual_balance || 0) - manualCashVal : 0

  const isOnlineVerified = manualOnlineVal <= 0 || Math.abs(data.onlineBalance - manualOnlineVal) < 0.01
  const isCashVerified = manualCashVal <= 0 || Math.abs(data.cashBalance - manualCashVal) < 0.01

  const verified = !hasManualData || (isOnlineVerified && isCashVerified)
  
  let faultAmount = 0
  if (!isOnlineVerified) faultAmount += Math.abs(data.onlineBalance - manualOnlineVal)
  if (!isCashVerified) faultAmount += Math.abs(data.cashBalance - manualCashVal)

  // Chart data for daily expenses
  const expenseByDate = {}
  data.expenses.forEach(e => {
    const dateKey = e.date
    expenseByDate[dateKey] = (expenseByDate[dateKey] || 0) + e.amount
  })
  const chartData = Object.entries(expenseByDate).map(([date, amount]) => ({
    date: new Date(date).getDate(),
    amount
  })).sort((a, b) => a.date - b.date)

  // Pie data for receivables
  const pieData = data.receivables
    .filter(a => a.balance > 0)
    .map(a => ({ name: a.name, value: a.balance }))

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Your financial overview at a glance</p>
      </div>

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
          <div className="stat-card-label">Available Balance</div>
          <div className={`stat-card-value ${getAmountClass(data.availableBalance)}`}>
            {formatCurrency(data.availableBalance)}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-icon blue"><TrendingUp size={20} /></div>
          <div className="stat-card-label">Total Receivables</div>
          <div className="stat-card-value positive">
            {formatCurrency(data.totalReceivables)}
          </div>
        </div>

        <div className="stat-card red">
          <div className="stat-card-icon red"><TrendingDown size={20} /></div>
          <div className="stat-card-label">Total Payables</div>
          <div className="stat-card-value negative">
            {formatCurrency(data.totalPayables)}
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-icon amber"><Banknote size={20} /></div>
          <div className="stat-card-label">Cash in Hand</div>
          <div className="stat-card-value">{formatCurrency(data.cashBalance)}</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-card-icon purple"><CreditCard size={20} /></div>
          <div className="stat-card-label">Online Balance</div>
          <div className="stat-card-value">{formatCurrency(data.onlineBalance)}</div>
        </div>

        <div className="stat-card indigo">
          <div className="stat-card-icon indigo"><PiggyBank size={20} /></div>
          <div className="stat-card-label">Other Banks</div>
          <div className="stat-card-value">{formatCurrency(data.bankBalance)}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="two-col-grid mb-24">
        {/* Daily Expenses Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Daily Expenses</div>
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
              <div className="card-title">Receivables Breakdown</div>
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
            <div className="stat-card-label">Total Spent</div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--red)' }}>
              {formatCurrency(data.totalExpenses)}
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            <div className="stat-card-label">Per Day Average</div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
              {formatCurrency(data.perDayAvg)}
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            <div className="stat-card-label">Days Tracked</div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--blue)' }}>
              {data.daysTracked} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {daysInMonth}</span>
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            <div className="stat-card-label">Monthly Estimate</div>
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
