import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getTransactions, getAccounts, updateTransaction, deleteTransaction, verifyTransaction, rejectTransaction, getLinkedAccounts } from '../lib/db'
import { formatCurrency, getAmountClass, formatDate } from '../lib/utils'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { 
  Search, Trash2, Edit2, Receipt, RefreshCw, Check, X
} from 'lucide-react'

export default function Transactions() {
  const { triggerRefresh } = useApp()
  const [searchParams] = useSearchParams()
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [linkedAccounts, setLinkedAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState(searchParams.get('verification') || 'all')

  // Edit / Delete State
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const filter = searchParams.get('verification') || 'all'
    setVerificationFilter(filter)
  }, [searchParams])

  async function loadData() {
    try {
      setLoading(true)
      // Fetch all transactions, accounts, and linked accounts
      const [txs, accs, linked] = await Promise.all([
        getTransactions(),
        getAccounts(),
        getLinkedAccounts()
      ])
      setTransactions(txs)
      setAccounts(accs)
      setLinkedAccounts(linked)
    } catch (err) {
      console.error('Failed to load transactions list:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(id) {
    try {
      await verifyTransaction(id)
      loadData()
      triggerRefresh()
    } catch (err) {
      console.error('Failed to verify transaction:', err)
    }
  }

  async function handleReject(id) {
    try {
      await rejectTransaction(id)
      loadData()
      triggerRefresh()
    } catch (err) {
      console.error('Failed to reject transaction:', err)
    }
  }

  const renderVerificationStatus = (txn) => {
    if (!txn.is_shared) return null

    if (txn.verification_status === 'pending') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 600, background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)', padding: '1px 6px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
            Pending Approval
          </span>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => handleVerify(txn.id)}
              style={{ color: 'var(--green)', padding: '2px 6px', fontSize: '0.65rem', height: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}
              type="button"
            >
              <Check size={10} /> Approve
            </button>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => handleReject(txn.id)}
              style={{ color: 'var(--red)', padding: '2px 6px', fontSize: '0.65rem', height: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}
              type="button"
            >
              <X size={10} /> Reject
            </button>
          </div>
        </div>
      )
    }

    if (!txn.partner_verified) {
      return (
        <span style={{ fontSize: '0.6rem', fontWeight: 600, background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue-border)', padding: '1px 6px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content', marginTop: 4 }}>
          Awaiting Partner
        </span>
      )
    }

    return (
      <span style={{ fontSize: '0.6rem', fontWeight: 600, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', padding: '1px 6px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content', marginTop: 4 }}>
        <Check size={8} /> Sync Verified
      </span>
    )
  }

  // Get distinct months from transactions list to populate month filter dropdown
  const monthOptions = useMemo(() => {
    const months = new Set()
    transactions.forEach(t => {
      if (t.month_year) months.add(t.month_year)
    })
    
    return Array.from(months).sort().reverse().map(m => {
      const [year, month] = m.split('-').map(Number)
      const d = new Date(year, month - 1, 1)
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      return { value: m, label }
    })
  }, [transactions])

  // Filter logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search Query (description or account name)
      const accountName = t.accounts?.name || ''
      const desc = t.description || ''
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        accountName.toLowerCase().includes(searchLower) || 
        desc.toLowerCase().includes(searchLower)

      // 2. Type Filter
      let matchesType = true
      if (typeFilter === 'credit') matchesType = t.amount > 0
      if (typeFilter === 'debit') matchesType = t.amount < 0

      // 3. Account Filter
      const matchesAccount = accountFilter === 'all' || t.account_id === accountFilter

      // 4. Month Filter
      const matchesMonth = monthFilter === 'all' || t.month_year === monthFilter

      // 5. Verification Status Filter
      let matchesVerification = true
      if (verificationFilter === 'pending') {
        matchesVerification = t.is_shared && t.verification_status === 'pending'
      } else if (verificationFilter === 'awaiting') {
        matchesVerification = t.is_shared && t.verification_status === 'completed' && !t.partner_verified
      } else if (verificationFilter === 'verified') {
        matchesVerification = !t.is_shared || (t.is_shared && t.verification_status === 'completed' && t.partner_verified)
      }

      return matchesSearch && matchesType && matchesAccount && matchesMonth && matchesVerification
    })
  }, [transactions, searchQuery, typeFilter, accountFilter, monthFilter, verificationFilter])

  // Handle transaction edit submit
  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingTransaction) return
    try {
      await updateTransaction(editingTransaction.id, {
        amount: parseFloat(editingTransaction.amount),
        description: editingTransaction.description,
        created_at: editingTransaction.date ? new Date(editingTransaction.date).toISOString() : undefined
      })
      setEditingTransaction(null)
      // Refresh local list and notify parent app
      loadData()
      triggerRefresh()
    } catch (err) {
      console.error('Failed to update transaction:', err)
    }
  }

  // Handle transaction delete confirm
  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    try {
      await deleteTransaction(deleteConfirm.id)
      setDeleteConfirm(null)
      // Refresh local list and notify parent app
      loadData()
      triggerRefresh()
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    }
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>All Transactions</h2>
          <p>View, search, filter, edit, and delete all created transactions</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        {/* Filters Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          alignItems: 'center'
        }}>
          {/* Search */}
          <div className="form-group" style={{ marginBottom: 0, flex: '2 1 220px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Search size={12} /> Search
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search description or account..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="credit">Credits (+)</option>
              <option value="debit">Debits (-)</option>
            </select>
          </div>

          {/* Account Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 160px' }}>
            <label className="form-label">Account</label>
            <select
              className="form-select"
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
            >
              <option value="all">All Months</option>
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Verification Status Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 180px' }}>
            <label className="form-label">Verification</label>
            <select
              className="form-select"
              value={verificationFilter}
              onChange={e => setVerificationFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending My Approval</option>
              <option value="awaiting">Awaiting Partner</option>
              <option value="verified">Sync Verified</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={16} color="var(--text-secondary)" />
              <div className="card-title">Transactions List</div>
              <div className="badge purple" style={{ marginLeft: 4 }}>
                {filteredTransactions.length} entries
              </div>
            </div>
            <button 
              className="btn btn-ghost btn-icon btn-sm" 
              onClick={loadData} 
              title="Refresh Data"
              type="button"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton" style={{ height: 40, width: '100%' }} />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <Receipt size={36} />
              <h3>No Transactions Found</h3>
              <p>Try resetting the search query or selecting other filters.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto', border: 'none', borderRadius: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'separate' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '10px 12px', background: 'var(--bg-elevated)' }}>Date</th>
                    <th style={{ padding: '10px 12px', background: 'var(--bg-elevated)' }}>Account</th>
                    <th style={{ padding: '10px 12px', background: 'var(--bg-elevated)' }}>Description</th>
                    <th style={{ padding: '10px 12px', background: 'var(--bg-elevated)', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '10px 12px', background: 'var(--bg-elevated)', textAlign: 'center', width: '110px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(txn => {
                    const acc = txn.accounts || {}
                    const isCredit = txn.amount > 0
                    
                    return (
                      <tr key={txn.id} style={{ transition: 'background var(--transition-fast)' }}>
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {formatDate(txn.created_at)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge ${
                            acc.type === 'receivable' ? 'green' : acc.type === 'payable' ? 'red' : 'blue'
                          }`} style={{ fontSize: '0.6rem' }}>
                            {acc.name || 'Unknown'}
                          </span>
                          {renderVerificationStatus(txn)}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={txn.description}>
                          {txn.description || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                        <td className={`amount ${isCredit ? 'positive' : 'negative'}`} style={{ padding: '10px 12px', fontSize: '0.75rem', textAlign: 'right' }}>
                          {formatCurrency(Math.abs(txn.amount))}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          {acc.type === 'payable' && (txn.is_shared || linkedAccounts.some(la => la.receivable_account_id === acc.id || la.payable_account_id === acc.id)) ? (
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 12 }}>
                              Linked Sync
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => setEditingTransaction({
                                  id: txn.id,
                                  amount: txn.amount,
                                  description: txn.description || '',
                                  date: txn.created_at ? txn.created_at.split('T')[0] : ''
                                })}
                                title="Edit Transaction"
                                type="button"
                                style={{ width: 32, height: 32 }}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => setDeleteConfirm({
                                  id: txn.id,
                                  amount: txn.amount,
                                  label: txn.description
                                })}
                                style={{ color: 'var(--red)', width: 32, height: 32 }}
                                title="Delete Transaction"
                                type="button"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Transaction Sub-Modal */}
      {editingTransaction && (
        <Modal title="Edit Transaction" onClose={() => setEditingTransaction(null)}>
          <form onSubmit={handleEditSubmit}>
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

      {/* Delete Transaction Confirm Sub-Modal */}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete Transaction?"
          message={`Are you sure you want to delete the transaction of ${formatCurrency(deleteConfirm.amount)} ${deleteConfirm.label ? `("${deleteConfirm.label}")` : ''}? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
