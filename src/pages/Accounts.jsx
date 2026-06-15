import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getAccountBalances, createAccount, deleteAccount, createTransaction, deleteTransaction, updateTransaction, createSharedLink, deleteSharedLink, getSharedLink } from '../lib/db'
import { formatCurrency, getAmountClass, getInitials, formatDate, exportToCSV } from '../lib/utils'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import InfoButton from '../components/InfoButton'
import {
  Plus, Trash2, Users, ArrowUpRight, ArrowDownRight, 
  UserPlus, Wallet, ChevronDown, ChevronUp, Receipt, Download,
  Share2, LinkIcon, Link2Off, Check, Copy
} from 'lucide-react'

export default function Accounts() {
  const { currentMonth, refreshKey, triggerRefresh } = useApp()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showAddTransaction, setShowAddTransaction] = useState(null)
  const [expandedAccount, setExpandedAccount] = useState(null)
  const [activeTab, setActiveTab] = useState('receivable')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [sharingAccount, setSharingAccount] = useState(null) // { accountId, token, loading, copied }
  const [sharedLinks, setSharedLinks] = useState({}) // { accountId: token }

  // Form state
  const [newAccount, setNewAccount] = useState({ name: '', type: 'receivable' })
  const [newTxn, setNewTxn] = useState({ amount: '', description: '', date: '' })

  useEffect(() => {
    loadAccounts()
  }, [currentMonth, refreshKey])

  async function loadAccounts() {
    try {
      setLoading(true)
      const data = await getAccountBalances(currentMonth)
      setAccounts(data)
      // Load shared links for receivable accounts
      const receivables = data.filter(a => a.type === 'receivable')
      const links = {}
      for (const acc of receivables) {
        try {
          const link = await getSharedLink(acc.id)
          if (link) links[acc.id] = link.token
        } catch (err) {
          // ignore
        }
      }
      setSharedLinks(links)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddAccount(e) {
    e.preventDefault()
    try {
      await createAccount(newAccount)
      setNewAccount({ name: '', type: 'receivable' })
      setShowAddAccount(false)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to create account:', err)
    }
  }

  async function handleDeleteAccount(id) {
    try {
      await deleteAccount(id)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to delete account:', err)
    }
  }

  const getDefaultDate = () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    if (todayStr === currentMonth) {
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    }
    return `${currentMonth}-01`
  }

  const handleOpenAddTransaction = (accountId) => {
    setNewTxn({ amount: '', description: '', date: getDefaultDate() })
    setShowAddTransaction(accountId)
  }

  async function handleAddTransaction(e) {
    e.preventDefault()
    try {
      await createTransaction({
        account_id: showAddTransaction,
        amount: parseFloat(newTxn.amount),
        description: newTxn.description,
        month_year: currentMonth,
        created_at: newTxn.date ? new Date(newTxn.date).toISOString() : undefined
      })
      setNewTxn({ amount: '', description: '', date: '' })
      setShowAddTransaction(null)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to create transaction:', err)
    }
  }

  async function handleEditTransaction(e) {
    e.preventDefault()
    if (!editingTransaction) return
    try {
      await updateTransaction(editingTransaction.id, {
        amount: parseFloat(editingTransaction.amount),
        description: editingTransaction.description,
        created_at: editingTransaction.date ? new Date(editingTransaction.date).toISOString() : undefined
      })
      setEditingTransaction(null)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to update transaction:', err)
    }
  }

  async function handleDeleteTransaction(id) {
    try {
      await deleteTransaction(id)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    }
  }

  const handleExportLedger = (account) => {
    const txns = account.transactions || []
    const headers = ['Date', 'Description', 'Amount (₹)']
    const rows = txns.map(t => [
      formatDate(t.created_at),
      t.description || '',
      t.amount
    ])
    exportToCSV(`${account.name}_ledger_${currentMonth}.csv`, headers, rows)
  }

  const handleShareAccount = async (accountId) => {
    try {
      setSharingAccount({ accountId, loading: true, copied: false })
      const link = await createSharedLink(accountId)
      const shareUrl = `${window.location.origin}/shared/${link.token}`
      await navigator.clipboard.writeText(shareUrl)
      setSharedLinks(prev => ({ ...prev, [accountId]: link.token }))
      setSharingAccount({ accountId, token: link.token, loading: false, copied: true })
      // Reset copied state after 3 seconds
      setTimeout(() => {
        setSharingAccount(prev => prev?.accountId === accountId ? { ...prev, copied: false } : prev)
      }, 3000)
    } catch (err) {
      console.error('Failed to share account:', err)
      setSharingAccount(null)
    }
  }

  const handleRevokeShare = async (accountId) => {
    try {
      await deleteSharedLink(accountId)
      setSharedLinks(prev => {
        const updated = { ...prev }
        delete updated[accountId]
        return updated
      })
      setSharingAccount(null)
    } catch (err) {
      console.error('Failed to revoke shared link:', err)
    }
  }

  const filtered = accounts.filter(a => a.type === activeTab)
  const totalBalance = filtered.reduce((s, a) => s + a.balance, 0)

  const selfAccounts = accounts.filter(a => a.type === 'self')
  const hasCash = selfAccounts.some(a => a.name?.toLowerCase().includes('cash'))
  const hasExpense = selfAccounts.some(a => a.name?.toLowerCase().includes('expense') || a.name?.toLowerCase().includes('expence'))
  const hasOnline = selfAccounts.some(a => {
    const name = a.name?.toLowerCase() || ''
    return !name.includes('cash') && !name.includes('expense') && !name.includes('expence') && !name.includes('bank')
  })

  const missingDefaults = []
  if (!hasCash) missingDefaults.push({ name: 'Cash In Hand', type: 'self' })
  if (!hasOnline) missingDefaults.push({ name: 'Online Money', type: 'self' })
  if (!hasExpense) missingDefaults.push({ name: 'Expence Money', type: 'self' })

  async function handleCreateDefaults() {
    try {
      for (const item of missingDefaults) {
        await createAccount(item)
      }
      triggerRefresh()
    } catch (err) {
      console.error('Failed to create default accounts:', err)
    }
  }

  const tabs = [
    { key: 'receivable', label: 'Receivable', icon: ArrowUpRight, color: 'green' },
    { key: 'payable', label: 'Payable', icon: ArrowDownRight, color: 'red' },
    { key: 'self', label: 'Self (Cash/Online)', icon: Wallet, color: 'blue' },
  ]

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Accounts</h2>
          <p>Manage people and money flow</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddAccount(true)}>
          <UserPlus size={16} /> Add Account
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="card mb-24 summary-card">
        <div>
          <div className="stat-card-label">
            Total {activeTab === 'receivable' ? 'Owed to You' : activeTab === 'payable' ? 'You Owe' : 'Your Balance'}
            <InfoButton metricId="accountsTabSummary" contextValues={{ tabName: activeTab, totalBalance }} />
          </div>
          <div className={`stat-card-value ${getAmountClass(totalBalance, activeTab)}`}>
            {formatCurrency(totalBalance)}
          </div>
        </div>
        <div className={`stat-card-icon ${tabs.find(t => t.key === activeTab)?.color}`}>
          <Users size={22} />
        </div>
      </div>

      {/* Default Accounts Setup banner */}
      {!loading && missingDefaults.length > 0 && (
        <div className="card mb-24" style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px dashed var(--amber)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div>
            <h4 style={{ color: 'var(--amber)', fontWeight: 600, marginBottom: 4, fontSize: '0.95rem' }}>Default Accounts Setup</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Set up default accounts to enable automated cash, online, and expense tracking (missing: {missingDefaults.map(d => d.name).join(', ')}).
            </p>
          </div>
          <button
            className="btn btn-sm"
            onClick={handleCreateDefaults}
            style={{
              background: 'var(--amber)',
              color: 'var(--bg-primary)',
              fontWeight: 600,
              flexShrink: 0
            }}
          >
            Create Missing
          </button>
        </div>
      )}

      {/* Account List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card">
              <div className="skeleton" style={{ width: '100%', height: 60 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={48} />
            <h3>No {activeTab} accounts yet</h3>
            <p>Click "Add Account" to create one</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(account => (
            <div key={account.id} className="card" style={{ padding: 0 }}>
              {/* Account Header */}
              <div
                className="account-header"
                onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
              >
                <div className="account-info">
                  <div style={{
                    width: 42, height: 42, borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-gradient)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem', color: 'white',
                    flexShrink: 0
                  }}>
                    {getInitials(account.name)}
                  </div>
                  <div className="account-name-container">
                    <div className="account-name">{account.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {account.transactions?.length || 0} transactions
                    </div>
                  </div>
                </div>
                <div className="account-meta">
                  <span className={`amount ${getAmountClass(account.balance, account.type)}`} style={{ fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center' }}>
                    {formatCurrency(account.balance)}
                    <InfoButton 
                      metricId="accountBalance" 
                      contextValues={{ accountName: account.name, balance: account.balance, txnCount: account.transactions?.length || 0 }} 
                    />
                  </span>
                  {expandedAccount === account.id ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Expanded Transactions */}
              {expandedAccount === account.id && (
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  padding: '16px 20px',
                  animation: 'slideUp 0.25s ease'
                }}>
                  {/* Tabular transactions list */}
                  <div className="table-wrapper mb-16" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: '100%' }}>
                    <table style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px 12px', fontSize: '0.7rem' }}>Date</th>
                          <th style={{ padding: '8px 12px', fontSize: '0.7rem' }}>Description</th>
                          <th style={{ padding: '8px 12px', fontSize: '0.7rem', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '8px 12px', fontSize: '0.7rem', textAlign: 'center', width: '120px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.transactions?.map(txn => (
                           <tr 
                            key={txn.id} 
                            onClick={() => {
                              setEditingTransaction({
                                id: txn.id,
                                amount: txn.amount,
                                description: txn.description || '',
                                date: txn.created_at ? txn.created_at.split('T')[0] : getDefaultDate()
                              })
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Click to edit transaction"
                          >
                            <td style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {formatDate(txn.created_at)}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 500 }}>
                              {txn.description || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                            </td>
                            <td className={`amount ${getAmountClass(txn.amount, `${account.type}-txn`)}`} style={{ padding: '8px 12px', fontSize: '0.75rem', textAlign: 'right' }}>
                              {formatCurrency(Math.abs(txn.amount))}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setEditingTransaction({
                                    id: txn.id,
                                    amount: txn.amount,
                                    description: txn.description || '',
                                    date: txn.created_at ? txn.created_at.split('T')[0] : getDefaultDate()
                                  })}
                                  title="Edit Transaction"
                                  style={{ padding: '2px 6px', height: 'auto', fontSize: '0.7rem' }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setDeleteConfirm({
                                    type: 'transaction',
                                    id: txn.id,
                                    label: txn.description,
                                    amount: txn.amount
                                  })}
                                  style={{ color: 'var(--red)', padding: '2px 6px', height: 'auto', fontSize: '0.7rem' }}
                                  title="Delete Transaction"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {(!account.transactions || account.transactions.length === 0) && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              No transactions recorded for this account.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                   <div className="account-actions">
                     <button
                       className="btn btn-secondary btn-sm btn-mobile-icon"
                       onClick={() => handleOpenAddTransaction(account.id)}
                       title="Add Transaction"
                     >
                       <Plus size={14} /> <span className="btn-text">Add Transaction</span>
                     </button>
                     <button
                       className="btn btn-secondary btn-sm btn-mobile-icon"
                       onClick={() => handleExportLedger(account)}
                       title="Export Ledger"
                     >
                       <Download size={14} /> <span className="btn-text">Export Ledger</span>
                     </button>
                     {account.type === 'receivable' && (
                       <>
                         {sharedLinks[account.id] ? (
                           <>
                             <button
                               className="btn btn-sm btn-mobile-icon"
                               style={{
                                 background: 'var(--green-bg)',
                                 color: 'var(--green)',
                                 borderColor: 'var(--green-border)',
                                 border: '1px solid var(--green-border)'
                               }}
                               onClick={() => {
                                 const shareUrl = `${window.location.origin}/shared/${sharedLinks[account.id]}`
                                 navigator.clipboard.writeText(shareUrl)
                                 setSharingAccount({ accountId: account.id, token: sharedLinks[account.id], loading: false, copied: true })
                                 setTimeout(() => {
                                   setSharingAccount(prev => prev?.accountId === account.id ? { ...prev, copied: false } : prev)
                                 }, 3000)
                               }}
                               title="Copy Share Link"
                             >
                               {sharingAccount?.accountId === account.id && sharingAccount?.copied
                                 ? <><Check size={14} /> <span className="btn-text">Copied!</span></>
                                 : <><Copy size={14} /> <span className="btn-text">Copy Link</span></>
                               }
                             </button>
                             <button
                               className="btn btn-sm btn-mobile-icon"
                               style={{
                                 background: 'var(--red-bg)',
                                 color: 'var(--red)',
                                 borderColor: 'var(--red-border)',
                                 border: '1px solid var(--red-border)'
                               }}
                               onClick={() => handleRevokeShare(account.id)}
                               title="Revoke Share Link"
                             >
                               <Link2Off size={14} /> <span className="btn-text">Revoke Link</span>
                             </button>
                           </>
                         ) : (
                           <button
                             className="btn btn-sm btn-mobile-icon"
                             style={{
                               background: 'var(--indigo-bg)',
                               color: 'var(--indigo)',
                               borderColor: 'var(--indigo-border)',
                               border: '1px solid var(--indigo-border)'
                             }}
                             onClick={() => handleShareAccount(account.id)}
                             disabled={sharingAccount?.accountId === account.id && sharingAccount?.loading}
                             title="Share Receivable"
                           >
                             <Share2 size={14} />
                             <span className="btn-text">
                               {sharingAccount?.accountId === account.id && sharingAccount?.loading
                                 ? 'Sharing...'
                                 : 'Share'
                               }
                             </span>
                           </button>
                         )}
                       </>
                     )}
                     <button
                       className="btn btn-danger btn-sm btn-mobile-icon"
                       onClick={() => setDeleteConfirm({
                         type: 'account',
                         id: account.id,
                         label: account.name
                       })}
                       title="Delete"
                     >
                       <Trash2 size={14} /> <span className="btn-text">Delete</span>
                     </button>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <Modal title="New Account" onClose={() => setShowAddAccount(false)}>
          <form onSubmit={handleAddAccount}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                placeholder="e.g., Business, pocket cash, rent..."
                value={newAccount.name}
                onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={newAccount.type}
                onChange={e => setNewAccount({ ...newAccount, type: e.target.value })}
              >
                <option value="receivable">Receivable (they owe me)</option>
                <option value="payable">Payable (I owe them)</option>
                <option value="self">Self (Cash / Online)</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddAccount(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Account</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <Modal title="Add Transaction" onClose={() => setShowAddTransaction(null)}>
          <form onSubmit={handleAddTransaction}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={newTxn.date}
                onChange={e => setNewTxn({ ...newTxn, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (positive = credit, negative = debit)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="e.g., 5000 or -2000"
                value={newTxn.amount}
                onChange={e => setNewTxn({ ...newTxn, amount: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                className="form-input"
                placeholder="e.g., Grocery shopping, refund, travel..."
                value={newTxn.description}
                onChange={e => setNewTxn({ ...newTxn, description: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddTransaction(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Transaction</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <Modal title="Edit Transaction" onClose={() => setEditingTransaction(null)}>
          <form onSubmit={handleEditTransaction}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={editingTransaction.date}
                onChange={e => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (positive = credit, negative = debit)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="e.g., 5000 or -2000"
                value={editingTransaction.amount}
                onChange={e => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                className="form-input"
                placeholder="e.g., Grocery shopping, refund, travel..."
                value={editingTransaction.description}
                onChange={e => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingTransaction(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal
          title={deleteConfirm.type === 'account' ? 'Delete Account?' : 'Delete Transaction?'}
          message={
            deleteConfirm.type === 'account'
              ? `Are you sure you want to delete the account "${deleteConfirm.label}" and all of its associated transactions? This action cannot be undone.`
              : `Are you sure you want to delete the transaction of ${formatCurrency(deleteConfirm.amount)} ${deleteConfirm.label ? `("${deleteConfirm.label}")` : ''}? This action cannot be undone.`
          }
          confirmText="Delete"
          onConfirm={() => {
            if (deleteConfirm.type === 'account') {
              handleDeleteAccount(deleteConfirm.id)
            } else {
              handleDeleteTransaction(deleteConfirm.id)
            }
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
