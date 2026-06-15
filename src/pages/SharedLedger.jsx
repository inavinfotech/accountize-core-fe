import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getSharedLedger } from '../lib/db'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'
import { ArrowDownRight, FileText, AlertTriangle } from 'lucide-react'

export default function SharedLedger() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSharedLedger()
  }, [token])

  async function loadSharedLedger() {
    try {
      setLoading(true)
      setError(null)
      const result = await getSharedLedger(token)
      if (!result) {
        setError('This shared link is invalid or has been revoked.')
        return
      }
      setData(result)
    } catch (err) {
      console.error('Failed to load shared ledger:', err)
      setError('Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="shared-ledger-page">
        <div className="shared-ledger-container">
          <div className="shared-ledger-brand">
            <img src="/logo.svg" alt="Accountify Logo" className="shared-ledger-logo" />
            <div>
              <h1 className="shared-ledger-brand-name">Accountify</h1>
              <p className="shared-ledger-brand-sub">Shared Receivable</p>
            </div>
          </div>
          <div className="shared-ledger-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
              <div className="skeleton" style={{ width: '60%', height: 28 }} />
              <div className="skeleton" style={{ width: '40%', height: 20 }} />
              <div className="skeleton" style={{ width: '100%', height: 200 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="shared-ledger-page">
        <div className="shared-ledger-container">
          <div className="shared-ledger-brand">
            <img src="/logo.svg" alt="Accountify Logo" className="shared-ledger-logo" />
            <div>
              <h1 className="shared-ledger-brand-name">Accountify</h1>
              <p className="shared-ledger-brand-sub">Shared Receivable</p>
            </div>
          </div>
          <div className="shared-ledger-card">
            <div className="shared-ledger-error">
              <div className="shared-ledger-error-icon">
                <AlertTriangle size={32} />
              </div>
              <h2>Link Not Found</h2>
              <p>{error}</p>
            </div>
          </div>
          <div className="shared-ledger-footer">
            Powered by <strong>Accountify</strong> — Personal Finance Tracker
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { account, transactions, balance } = data

  // Running balance for each transaction
  let runningBalance = 0
  const txnsWithBalance = transactions.map(t => {
    runningBalance += t.amount || 0
    return { ...t, runningBalance }
  })

  return (
    <div className="shared-ledger-page">
      <div className="shared-ledger-container">
        {/* Brand Header */}
        <div className="shared-ledger-brand">
          <img src="/logo.svg" alt="Accountify Logo" className="shared-ledger-logo" />
          <div>
            <h1 className="shared-ledger-brand-name">Accountify</h1>
            <p className="shared-ledger-brand-sub">Shared Receivable</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="shared-ledger-card animate-in">
          {/* Account Header */}
          <div className="shared-ledger-header">
            <div className="shared-ledger-avatar">
              {getInitials(account.name)}
            </div>
            <div className="shared-ledger-account-info">
              <h2 className="shared-ledger-account-name">{account.name}</h2>
              <div className="shared-ledger-badge" style={{ background: 'var(--red-bg)', color: 'var(--red)', borderColor: 'var(--red-border)' }}>
                <ArrowDownRight size={12} />
                Payable Account
              </div>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="shared-ledger-balance-strip">
            <div className="shared-ledger-balance-item">
              <span className="shared-ledger-balance-label">Total Balance</span>
              <span className={`shared-ledger-balance-value ${balance > 0 ? 'negative' : balance < 0 ? 'positive' : ''}`}>
                {formatCurrency(balance)}
              </span>
            </div>
            <div className="shared-ledger-balance-divider" />
            <div className="shared-ledger-balance-item">
              <span className="shared-ledger-balance-label">Transactions</span>
              <span className="shared-ledger-balance-value">{transactions.length}</span>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="shared-ledger-table-section">
            <h3 className="shared-ledger-section-title">
              <FileText size={16} />
              Transaction History
            </h3>
            {transactions.length > 0 ? (
              <div className="table-wrapper" style={{ border: '1px solid var(--border-color)' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px', fontSize: '0.7rem' }}>#</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.7rem' }}>Date</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.7rem' }}>Description</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.7rem', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.7rem', textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txnsWithBalance.map((txn, idx) => (
                      <tr key={txn.id}>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatDate(txn.created_at)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 500 }}>
                          {txn.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{
                          padding: '10px 14px',
                          fontSize: '0.8rem',
                          textAlign: 'right',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          color: txn.amount > 0 ? 'var(--red)' : txn.amount < 0 ? 'var(--green)' : 'var(--text-primary)'
                        }}>
                          {formatCurrency(Math.abs(txn.amount))}
                        </td>
                        <td style={{
                          padding: '10px 14px',
                          fontSize: '0.8rem',
                          textAlign: 'right',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          color: txn.runningBalance > 0 ? 'var(--red)' : txn.runningBalance < 0 ? 'var(--green)' : 'var(--text-primary)'
                        }}>
                          {formatCurrency(txn.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="shared-ledger-empty">
                <FileText size={32} />
                <p>No transactions recorded yet</p>
              </div>
            )}
          </div>

          {/* Total Footer */}
          {transactions.length > 0 && (
            <div className="shared-ledger-total">
              <span>Net Balance</span>
              <span className={balance > 0 ? 'negative' : balance < 0 ? 'positive' : ''}>
                {formatCurrency(balance)}
              </span>
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="shared-ledger-footer">
          Powered by <strong>Accountify</strong> — Personal Finance Tracker
        </div>
      </div>
    </div>
  )
}
