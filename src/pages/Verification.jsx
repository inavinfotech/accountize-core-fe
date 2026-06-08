import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getDashboardData, upsertMonthlySummary } from '../lib/db'
import { formatCurrency, getAmountClass } from '../lib/utils'
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

  useEffect(() => {
    loadData()
  }, [currentMonth, refreshKey])

  async function loadData() {
    try {
      setLoading(true)
      const d = await getDashboardData(currentMonth)
      setData(d)
      if (d.summary) {
        const manBal = d.summary.manual_balance || 0
        const manCash = d.summary.manual_cash || 0
        setManualBalance(manBal ? manBal.toString() : '')
        setManualCash(manCash ? manCash.toString() : '')
        setManualOnline((manBal || manCash) ? (manBal - manCash).toString() : '')
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
    setManualBalance((cashNum + onlineNum).toString())
  }

  const handleOnlineChange = (val) => {
    setManualOnline(val)
    const cashNum = parseFloat(manualCash) || 0
    const onlineNum = parseFloat(val) || 0
    setManualBalance((cashNum + onlineNum).toString())
  }

  const handleTotalChange = (val) => {
    setManualBalance(val)
    const totNum = parseFloat(val) || 0
    const cashNum = parseFloat(manualCash) || 0
    setManualOnline((totNum - cashNum).toString())
  }

  async function handleSave() {
    try {
      setSaving(true)
      const manualBal = parseFloat(manualBalance) || 0
      const manualCashVal = parseFloat(manualCash) || 0
      const manualOnlineVal = parseFloat(manualOnline) || 0
      
      // Matching Excel I31: IF(ROUND(F31,2)=ROUND(H31,2), "No Fault", "Fault")
      const isOnlineVerified = Math.round(data.onlineBalance * 100) === Math.round(manualOnlineVal * 100)
      const onlineFault = data.onlineBalance - manualOnlineVal

      // Matching Excel G55/H55: Cash verification
      const cashVerified = Math.round(data.cashBalance * 100) === Math.round(manualCashVal * 100)

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

  if (loading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h2>Verification</h2>
          <p>Cross-check your accounts</p>
        </div>
        <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
      </div>
    )
  }

  if (!data) return null

  const manualCashVal = parseFloat(manualCash) || 0
  const manualOnlineVal = parseFloat(manualOnline) || 0

  // Excel Row 31 formulas (Online Check — F31 vs H31)
  const isOnlineVerified = manualOnlineVal > 0 && Math.abs(data.onlineBalance - manualOnlineVal) < 0.01
  const onlineFault = data.onlineBalance - manualOnlineVal

  // Excel Row 54-55 (Cash Check)
  const isCashVerified = manualCashVal > 0 && Math.abs(data.cashBalance - manualCashVal) < 0.01
  const cashFault = data.cashBalance - manualCashVal

  const allVerified = isOnlineVerified && isCashVerified

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Verification</h2>
        <p>Fault detection and cross-check logic</p>
      </div>

      {/* Overall Status */}
      {manualOnlineVal > 0 && !allVerified && (
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
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Assets</span>
              <span className="amount positive">{formatCurrency(data.totalAssets)}</span>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Liabilities</span>
              <span className="amount negative">{formatCurrency(data.totalPayables)}</span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="flex-between">
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Available Balance</span>
              <span className={`amount ${getAmountClass(data.availableBalance)}`} style={{ fontSize: '1.1rem' }}>
                {formatCurrency(data.availableBalance)}
              </span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="flex-between" style={{ marginBottom: 2 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Online Balance</span>
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
                <span>Online Accounts Raw:</span>
                <span>{formatCurrency(data.rawOnlineBalance)}</span>
              </div>
              <div className="flex-between">
                <span>Expense Allotted:</span>
                <span className="positive">+{formatCurrency(data.expenseAllotted)}</span>
              </div>
              <div className="flex-between">
                <span>Total Expenses (Cumulative):</span>
                <span className="negative">-{formatCurrency(data.totalExpensesUpTo)}</span>
              </div>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Cash Balance</span>
              <span className="amount">{formatCurrency(data.cashBalance)}</span>
            </div>
              <div className="flex-between" style={{ marginBottom: 2 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Other Banks Balance</span>
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
            <label className="form-label">Your actual cash in hand</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="Enter your manually counted cash"
              value={manualCash}
              onChange={e => handleCashChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Your actual online balance</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="Enter your manually counted online balance"
              value={manualOnline}
              onChange={e => handleOnlineChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Your actual total balance (Cash + Online)</label>
            <input
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
      {manualOnlineVal > 0 && (
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
                  <td style={{ fontWeight: 600 }}>Online Balance Check</td>
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
                {manualCashVal > 0 && (
                  <tr>
                    <td style={{ fontWeight: 600 }}>Cash Balance Check</td>
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
