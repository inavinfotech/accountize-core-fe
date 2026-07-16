import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSharedLedger, getAccounts, createAccount, linkSharedAccount, getLinkedAccount } from '../lib/db'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'
import { ArrowDownRight, FileText, AlertTriangle, Users } from 'lucide-react'

export default function SharedLedger() {
  const { token } = useParams()
  const { user } = useAuth() || {}
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Collaborative linking states
  const [linkedAccount, setLinkedAccount] = useState(null)
  const [myAccounts, setMyAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [linkingMode, setLinkingMode] = useState('select')
  const [linkingSuccess, setLinkingSuccess] = useState(false)
  const [linkingLoading, setLinkingLoading] = useState(false)

  useEffect(() => {
    loadSharedLedger()
  }, [token])

  useEffect(() => {
    if (user && data?.account) {
      checkLinkedStatus()
      loadMyAccounts()
    }
  }, [user, data])

  async function checkLinkedStatus() {
    try {
      const link = await getLinkedAccount(data.account.id)
      if (link) {
        setLinkedAccount(link)
      }
    } catch (err) {
      console.error('Error checking linked status:', err)
    }
  }

  async function loadMyAccounts() {
    try {
      const accs = await getAccounts()
      setMyAccounts(accs.filter(a => a.type === 'payable'))
    } catch (err) {
      console.error('Error loading my accounts:', err)
    }
  }

  async function handleLink(e) {
    e.preventDefault()
    try {
      setLinkingLoading(true)
      let payableAccountId = selectedAccount
      if (linkingMode === 'new') {
        if (!newAccountName.trim()) return
        const newAcc = await createAccount({
          name: newAccountName.trim(),
          type: 'payable',
          subtype: 'other'
        })
        payableAccountId = newAcc.id
      }

      if (!payableAccountId) return

      await linkSharedAccount(token, payableAccountId)
      setLinkingSuccess(true)
      await checkLinkedStatus()
    } catch (err) {
      console.error('Failed to link ledger:', err)
      alert('Failed to link shared ledger. Please try again.')
    } finally {
      setLinkingLoading(false)
    }
  }

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

        {/* Collaborative Connection Card for logged in users */}
        {user && (
          <div className="shared-ledger-card animate-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <Users size={16} color="var(--accent-primary)" />
              Collaborative Ledger Sync
            </h3>
            
            {linkedAccount ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  This shared receivable ledger is connected to one of your payable accounts. Transactions added by the owner will automatically sync to your dashboard for verification.
                </p>
                <div className="shared-ledger-badge" style={{ width: 'fit-content', background: 'var(--blue-bg)', color: 'var(--blue)', borderColor: 'var(--blue-border)', marginTop: 8 }}>
                  Linked & Syncing
                </div>
              </div>
            ) : linkingSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 600, margin: 0 }}>
                  Ledger successfully linked!
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Existing transactions have been imported to your payable account as pending. You can verify them on the Transactions page.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Link this shared ledger to your own payable section. Transactions logged by the owner will show up in your account and require your approval to update your balances.
                </p>
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 550 }}>
                    <input 
                      type="radio" 
                      name="linkingMode" 
                      checked={linkingMode === 'select'} 
                      onChange={() => setLinkingMode('select')}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    Existing Account
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 550 }}>
                    <input 
                      type="radio" 
                      name="linkingMode" 
                      checked={linkingMode === 'new'} 
                      onChange={() => setLinkingMode('new')}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    New Account
                  </label>
                </div>

                {linkingMode === 'select' ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Local Payable Account</label>
                    <select 
                      className="form-select"
                      value={selectedAccount}
                      onChange={e => setSelectedAccount(e.target.value)}
                      required
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    >
                      <option value="">-- Choose Account --</option>
                      {myAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                    {myAccounts.length === 0 && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        No payable accounts found. Select "New Account" to create one.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>New Account Name</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder={`e.g. Lent by ${account.name}`}
                      value={newAccountName}
                      onChange={e => setNewAccountName(e.target.value)}
                      required
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: 'fit-content', padding: '6px 16px', fontSize: '0.8rem' }}
                  disabled={linkingLoading || (linkingMode === 'select' && !selectedAccount) || (linkingMode === 'new' && !newAccountName)}
                >
                  {linkingLoading ? 'Linking...' : 'Establish Link & Sync'}
                </button>
              </form>
            )}
          </div>
        )}

        {!user && (
          <div className="shared-ledger-card animate-in" style={{ 
            padding: 24, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <Users size={16} color="var(--accent-primary)" />
              Connect to your Accountify Account
            </h3>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Do you want to sync this shared ledger? Sign in or create a free Accountify account to link this ledger. Transactions logged here by the owner will automatically sync to your dashboard for easy verification and tracking.
            </p>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <a 
                href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="btn btn-primary"
                style={{ 
                  textDecoration: 'none', 
                  textAlign: 'center', 
                  fontSize: '0.8rem', 
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                Sign In / Sign Up to Connect
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shared-ledger-footer">
          Powered by <strong>Accountify</strong> — Personal Finance Tracker
        </div>
      </div>
    </div>
  )
}
