import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getDashboardData, upsertMonthlySummary, createTransaction, deleteTransaction } from '../lib/db'
import { formatCurrency, getAmountClass } from '../lib/utils'
import { VerificationSkeleton } from '../components/Skeletons'
import InfoButton from '../components/InfoButton'
import {
  ShieldCheck, ShieldAlert, Save, AlertTriangle,
  CheckCircle2, XCircle, ArrowRight
} from 'lucide-react'

export default function Verification() {
  const { currentMonth, refreshKey, triggerRefresh } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [manualBalance, setManualBalance] = useState('')
  const [manualCash, setManualCash] = useState('')
  const [manualOnline, setManualOnline] = useState('')
  const [saving, setSaving] = useState(false)

  const [prevMonth, setPrevMonth] = useState(currentMonth)

  const [settleAmount, setSettleAmount] = useState('')
  const [settleAccountId, setSettleAccountId] = useState('')
  const [userEditedAmount, setUserEditedAmount] = useState(false)

  useEffect(() => {
    const isMonthChange = currentMonth !== prevMonth
    setPrevMonth(currentMonth)
    loadData(!isMonthChange && data !== null)
  }, [currentMonth, refreshKey])

  useEffect(() => {
    setUserEditedAmount(false)
    setSettleAmount('')
    setSettleAccountId('')
  }, [currentMonth])

  useEffect(() => {
    if (data && !userEditedAmount) {
      setSettleAmount(data.totalExpenses.toString())
    }
  }, [data, userEditedAmount])

  useEffect(() => {
    if (data) {
      const expAccs = data.balances.filter(a => a.subtype === 'expense')
      if (expAccs.length > 0 && !settleAccountId) {
        setSettleAccountId(expAccs[0].id)
      }
    }
  }, [data, settleAccountId])

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true)
      const d = await getDashboardData(currentMonth)
      setData(d)
      if (d.summary) {
        const manBal = d.summary.manual_balance || 0
        const manCash = d.summary.manual_cash || 0
        setManualBalance(manBal ? manBal.toString() : '')
        setManualCash(manCash ? manCash.toString() : '')
        setManualOnline((manBal || manCash) ? (Math.round((manBal - manCash) * 100) / 100).toString() : '')
      } else {
        setManualBalance('')
        setManualCash('')
        setManualOnline('')
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCashChange = (val) => {
    setManualCash(val)
    const cashNum = parseFloat(val) || 0
    const onlineNum = parseFloat(manualOnline) || 0
    setManualBalance((Math.round((cashNum + onlineNum) * 100) / 100).toString())
  }

  const handleOnlineChange = (val) => {
    setManualOnline(val)
    const cashNum = parseFloat(manualCash) || 0
    const onlineNum = parseFloat(val) || 0
    setManualBalance((Math.round((cashNum + onlineNum) * 100) / 100).toString())
  }

  const handleTotalChange = (val) => {
    setManualBalance(val)
    const totNum = parseFloat(val) || 0
    const cashNum = parseFloat(manualCash) || 0
    setManualOnline((Math.round((totNum - cashNum) * 100) / 100).toString())
  }

  async function handleSave() {
    try {
      setSaving(true)
      const manualBal = parseFloat(manualBalance) || 0
      const manualCashVal = parseFloat(manualCash) || 0
      const manualOnlineVal = parseFloat(manualOnline) || 0
      
      // Matching Excel I31: IF(ROUND(F31,2)=ROUND(H31,2), "No Fault", "Fault")
      const isOnlineVerified = !manualOnline || Math.round(data.onlineBalance * 100) === Math.round(manualOnlineVal * 100)
      const onlineFault = data.onlineBalance - manualOnlineVal

      // Matching Excel G55/H55: Cash verification
      const cashVerified = !manualCash || Math.round(data.cashBalance * 100) === Math.round(manualCashVal * 100)

      await upsertMonthlySummary({
        month_year: currentMonth,
        total_assets: data.totalAssets,
        total_liabilities: data.totalPayables,
        available_balance: data.availableBalance,
        cash_balance: data.cashBalance,
        online_balance: data.onlineBalance,
        manual_balance: manualBal,
        manual_cash: manualCashVal,
        is_verified: isOnlineVerified && cashVerified,
        fault_amount: onlineFault,
      })
      triggerRefresh()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
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
      console.error('Failed to settle expenses:', err)
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

  if (loading) {
    return <VerificationSkeleton />
  }

  if (!data) return null

  const manualCashVal = parseFloat(manualCash) || 0
  const manualOnlineVal = parseFloat(manualOnline) || 0

  // Excel Row 31 formulas (Online Check — F31 vs H31)
  const isOnlineVerified = !manualOnline || Math.abs(data.onlineBalance - manualOnlineVal) < 0.01
  const onlineFault = data.onlineBalance - manualOnlineVal

  // Excel Row 54-55 (Cash Check)
  const isCashVerified = !manualCash || Math.abs(data.cashBalance - manualCashVal) < 0.01
  const cashFault = data.cashBalance - manualCashVal

  const allVerified = isOnlineVerified && isCashVerified

  const expenseAccounts = data.balances.filter(a => a.subtype === 'expense')
  const settlementTxn = expenseAccounts.reduce((found, acc) => {
    if (found) return found
    const t = acc.transactions?.find(tx => tx.description === 'Settle Monthly Expenses')
    return t ? { ...t, accountName: acc.name } : null
  }, null)

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Verification</h2>
        <p>Fault detection and cross-check logic</p>
      </div>

      {/* Overall Status */}
      {(manualBalance || manualCash) && !allVerified && (
        <div className="verification-banner fail">
          <div className="verification-banner-icon">
            <ShieldAlert size={24} />
          </div>
          <div className="verification-banner-text">
            <h3>Discrepancy Detected</h3>
            <p>Review the checks below to identify the discrepancy.</p>
          </div>
        </div>
      )}

      <div className="two-col-grid mb-24">
        {/* Calculated Values */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Calculated (System)</div>
            <div className="badge blue">Auto</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="flex-between">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Total Assets
                <InfoButton metricId="totalAssetsVerification" contextValues={data} />
              </span>
              <span className="amount positive">{formatCurrency(data.totalAssets)}</span>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Total Liabilities
                <InfoButton metricId="totalLiabilitiesVerification" contextValues={data} />
              </span>
              <span className="amount negative">{formatCurrency(data.totalPayables)}</span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="flex-between">
              <span style={{ fontWeight: 600, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Available Balance
                <InfoButton metricId="availableBalance" contextValues={data} />
              </span>
              <span className={`amount ${getAmountClass(data.availableBalance)}`} style={{ fontSize: '1.1rem' }}>
                {formatCurrency(data.availableBalance)}
              </span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="flex-between" style={{ marginBottom: 2 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Online Balance
                <InfoButton metricId="onlineBalance" contextValues={data} />
              </span>
              <span className="amount" style={{ fontWeight: 600 }}>{formatCurrency(data.onlineBalance)}</span>
            </div>
            <div style={{
              paddingLeft: 12,
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              borderLeft: '2px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}>
              <div className="flex-between">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Online Accounts Raw:
                  <InfoButton metricId="onlineAccountsRawVerification" contextValues={data} />
                </span>
                <span className={`amount ${getAmountClass(data.rawOnlineBalance)}`}>{formatCurrency(data.rawOnlineBalance)}</span>
              </div>
              <div className="flex-between">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Expense Allotted:
                  <InfoButton metricId="expenseAllottedVerification" contextValues={data} />
                </span>
                <span className={`amount ${getAmountClass(data.expenseAllotted)}`}>{formatCurrency(data.expenseAllotted)}</span>
              </div>
              <div className="flex-between">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Total Expenses:
                  <InfoButton metricId="totalExpenses" contextValues={data} />
                </span>
                <span className="amount negative">{formatCurrency(data.totalExpenses)}</span>
              </div>
              {settlementTxn && (
                <div className="flex-between">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Settled Expenses:
                  </span>
                  <span className="amount positive">+{formatCurrency(Math.abs(settlementTxn.amount))}</span>
                </div>
              )}
            </div>
            {(() => {
              if (expenseAccounts.length === 0) return null

              return (
                <div style={{
                  marginTop: 8,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Settlement Status</span>
                    {settlementTxn ? (
                      <span className="badge green" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Settled</span>
                    ) : (
                      <span className="badge red" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Pending</span>
                    )}
                  </div>
                  {settlementTxn ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Subtracted {formatCurrency(Math.abs(settlementTxn.amount))} from {settlementTxn.accountName}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleUndoSettle(settlementTxn.id)}
                        style={{ padding: '2px 6px', height: 'auto', fontSize: '0.7rem', color: 'var(--red)', fontWeight: 600 }}
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="verify-settle-account-select" className="form-label" style={{ fontSize: '0.7rem', marginBottom: 2 }}>Account</label>
                        <select
                          id="verify-settle-account-select"
                          className="form-input form-input-sm"
                          value={settleAccountId}
                          onChange={e => setSettleAccountId(e.target.value)}
                          style={{ fontSize: '0.7rem', padding: '4px 8px', height: 'auto' }}
                        >
                          {expenseAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="verify-settle-amount-input" className="form-label" style={{ fontSize: '0.7rem', marginBottom: 2 }}>Amount to Subtract (₹)</label>
                        <input
                          id="verify-settle-amount-input"
                          type="number"
                          className="form-input form-input-sm"
                          value={settleAmount}
                          onChange={e => {
                            setSettleAmount(e.target.value)
                            setUserEditedAmount(true)
                          }}
                          style={{ fontSize: '0.7rem', padding: '4px 8px', height: 'auto' }}
                        />
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSettle(settleAccountId, parseFloat(settleAmount) || 0)}
                        disabled={!settleAccountId || (parseFloat(settleAmount) || 0) <= 0}
                        style={{ fontSize: '0.7rem', padding: '5px 10px', alignSelf: 'flex-start', fontWeight: 600 }}
                      >
                        Settle Expenses
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
            <div className="flex-between">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Cash Balance
                <InfoButton metricId="cashBalance" contextValues={data} />
              </span>
              <span className="amount">{formatCurrency(data.cashBalance)}</span>
            </div>
              <div className="flex-between" style={{ marginBottom: 2 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Other Banks Balance
                  <InfoButton metricId="bankBalance" contextValues={data} />
                </span>
                <span className="amount" style={{ fontWeight: 600 }}>{formatCurrency(data.bankBalance)}</span>
              </div>
          </div>
        </div>

        {/* Manual Cross-Check */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Manual Cross-Check</div>
            <div className="badge amber">Manual</div>
          </div>

          <div className="form-group">
            <label htmlFor="manual-cash-input" className="form-label">Your actual cash in hand</label>
            <input
              id="manual-cash-input"
              className="form-input"
              type="number"
              step="0.01"
              placeholder="Enter your manually counted cash"
              value={manualCash}
              onChange={e => handleCashChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="manual-online-input" className="form-label">Your actual online balance</label>
            <input
              id="manual-online-input"
              className="form-input"
              type="number"
              step="0.01"
              placeholder="Enter your manually counted online balance"
              value={manualOnline}
              onChange={e => handleOnlineChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="manual-balance-input" className="form-label">Your actual total balance (Cash + Online)</label>
            <input
              id="manual-balance-input"
              className="form-input"
              type="number"
              step="0.01"
              placeholder="Auto-summed (or enter manually)"
              value={manualBalance}
              onChange={e => handleTotalChange(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', marginTop: 8 }}
          >
            {saving ? (
              <div className="loading-spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saving...' : 'Verify & Save'}
          </button>
        </div>
      </div>

      {/* Verification Results */}
      {(manualBalance || manualCash) && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Verification Results</div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Calculated</th>
                  <th></th>
                  <th>Manual</th>
                  <th>Difference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Online Balance Check
                      <InfoButton metricId="onlineBalanceCheck" contextValues={{ ...data, manualOnlineVal }} />
                    </div>
                  </td>
                  <td className={`amount ${getAmountClass(data.onlineBalance)}`}>
                    {formatCurrency(data.onlineBalance)}
                  </td>
                  <td style={{ textAlign: 'center' }}><ArrowRight size={14} color="var(--text-muted)" /></td>
                  <td className="amount">{formatCurrency(manualOnlineVal)}</td>
                  <td className={`amount ${Math.abs(onlineFault) < 0.01 ? '' : 'negative'}`}>
                    {formatCurrency(onlineFault, true)}
                  </td>
                  <td>
                    <span className={`badge  ${isOnlineVerified ? 'green' : 'red'}`}>
                      {isOnlineVerified ? <><CheckCircle2 size={12} /> No Fault</> : <><XCircle size={12} /> Fault</>}
                    </span>
                  </td>
                </tr>
                {manualCash !== '' && (
                  <tr>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Cash Balance Check
                        <InfoButton metricId="cashBalanceCheck" contextValues={{ ...data, manualCashVal }} />
                      </div>
                    </td>
                    <td className="amount">{formatCurrency(data.cashBalance)}</td>
                    <td style={{ textAlign: 'center' }}><ArrowRight size={14} color="var(--text-muted)" /></td>
                    <td className="amount">{formatCurrency(manualCashVal)}</td>
                    <td className={`amount ${Math.abs(cashFault) < 0.01 ? '' : 'negative'}`}>
                      {formatCurrency(cashFault, true)}
                    </td>
                    <td>
                      <span className={`badge ${isCashVerified ? 'green' : 'red'}`}>
                        {isCashVerified ? <><CheckCircle2 size={12} /> No Fault</> : <><XCircle size={12} /> Fault</>}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
