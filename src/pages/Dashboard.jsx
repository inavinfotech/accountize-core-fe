import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { getDashboardData, createTransaction, getTransactions, createAccount } from '../lib/db'
import { formatCurrency, getAmountClass, getDaysInMonth } from '../lib/utils'
import { analytics } from '../lib/analytics'
import { exportToPDF } from '../lib/pdfExport'
import { DashboardSkeleton } from '../components/Skeletons'
import InfoButton from '../components/InfoButton'
import Modal from '../components/Modal'
import {
  Wallet, TrendingUp, TrendingDown, Banknote, CreditCard,
  ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, PiggyBank, Download
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts'

const PIE_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function Dashboard() {
  const navigate = useNavigate()
  const { currentMonth, refreshKey, triggerRefresh } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingTxnCount, setPendingTxnCount] = useState(0)
  const [prevMonth, setPrevMonth] = useState(currentMonth)
  const [showDefaultModal, setShowDefaultModal] = useState(false)
  const [creatingDefaults, setCreatingDefaults] = useState(false)

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
      if (d?.missingDefaults && d.missingDefaults.length > 0) {
        setShowDefaultModal(true)
      } else {
        setShowDefaultModal(false)
      }
      
      // Fetch pending transactions
      try {
        const txs = await getTransactions()
        const pending = txs.filter(t => t.is_shared && t.verification_status === 'pending')
        setPendingTxnCount(pending.length)
      } catch (err) {
        console.error('Failed to fetch pending transactions:', err)
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateMissingDefaults() {
    if (!data?.missingDefaults || data.missingDefaults.length === 0) return
    try {
      setCreatingDefaults(true)
      for (const item of data.missingDefaults) {
        await createAccount(item)
      }
      setShowDefaultModal(false)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to create default accounts from dashboard:', err)
    } finally {
      setCreatingDefaults(false)
    }
  }

  const daysInMonth = getDaysInMonth(currentMonth)

  const {
    estimatedMonthly,
    hasManualData,
    verified,
    faultAmount,
    pieData
  } = useMemo(() => {
    if (!data) {
      return {
        estimatedMonthly: 0,
        hasManualData: false,
        verified: true,
        faultAmount: 0,
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

    // Pie data for receivables
    const pie = data.receivables
      .filter(a => a.balance > 0)
      .map(a => ({ name: a.name, value: a.balance }))

    return {
      estimatedMonthly: est,
      hasManualData: manualData,
      verified: isVerified,
      faultAmount: fault,
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

  const { user } = useAuth() || {}

  const handleExportPDF = () => {
    if (!data) return
    exportToPDF('dashboard', data, currentMonth, user)
  }

  if (loading) {
    return <DashboardSkeleton />
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
            onClick={handleExportPDF}
            title="Export PDF Statement"
          >
            <Download size={14} /> <span className="btn-text">PDF Report</span>
          </button>
        )}
      </div>

      {/* Pending Verification Banner */}
      {pendingTxnCount > 0 && (
        <div className="verification-banner" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--indigo)', marginBottom: 20 }}>
          <div className="verification-banner-icon" style={{ color: 'var(--indigo)' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="verification-banner-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', width: '100%', gap: 12 }}>
            <div>
              <h3 style={{ color: 'var(--indigo)', margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600 }}>Action Required</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
                You have {pendingTxnCount} collaborative transaction{pendingTxnCount > 1 ? 's' : ''} awaiting your verification.
              </p>
            </div>
            <button
              onClick={() => navigate('/transactions?verification=pending')}
              className="btn btn-primary btn-sm"
              style={{
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              Review & Approve
            </button>
          </div>
        </div>
      )}

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

      {/* Receivables Breakdown */}
      <div className="card mb-24">
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
            <div style={{ width: '45%', height: 180, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={180} minWidth={0}>
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

      {showDefaultModal && data?.missingDefaults?.length > 0 && (
        <Modal title="Default Accounts Setup" onClose={() => setShowDefaultModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.9rem' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--amber)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              color: 'var(--amber)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10
            }}>
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 2 }}>Action Required</strong>
                The following default accounts could not be automatically set up: 
                <span style={{ fontWeight: 600, marginLeft: 4 }}>
                  {data.missingDefaults.map(d => d.name).join(', ')}
                </span>.
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Default accounts are required for cash management, online balance calculations, and expense tracking.
            </p>
            <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDefaultModal(false)}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateMissingDefaults}
                disabled={creatingDefaults}
              >
                {creatingDefaults ? 'Creating...' : 'Create Missing Accounts'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
