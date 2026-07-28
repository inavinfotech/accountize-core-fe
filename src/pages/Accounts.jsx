import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { getAccountBalances, createAccount, deleteAccount, createTransaction, deleteTransaction, updateTransaction, createSharedLink, deleteSharedLink, getSharedLink, getLinkedAccounts, verifyTransaction, rejectTransaction } from '../lib/db'
import { formatCurrency, getAmountClass, getInitials, formatDate, exportToCSV } from '../lib/utils'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import InfoButton from '../components/InfoButton'
import {
  Plus, Trash2, Users, ArrowUpRight, ArrowDownRight, 
  UserPlus, Wallet, ChevronDown, ChevronUp, Receipt, Download,
  Share2, LinkIcon, Link2Off, Check, Copy, X
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
  const [linkedAccounts, setLinkedAccounts] = useState([])

  const [newAccount, setNewAccount] = useState({ name: '', type: 'receivable', subtype: 'other' })
  const [newTxn, setNewTxn] = useState({ amount: '', description: '', date: '' })

  const [syncWithOnline, setSyncWithOnline] = useState(false)
  const [syncOnlineAccountId, setSyncOnlineAccountId] = useState('')

  const selectedAccount = useMemo(() => {
    if (!showAddTransaction) return null
    return accounts.find(a => a.id === showAddTransaction)
  }, [showAddTransaction, accounts])

  const onlineAccounts = useMemo(() => {
    return accounts.filter(a => a.type === 'self' && a.subtype === 'online')
  }, [accounts])

  useEffect(() => {
    if (onlineAccounts.length > 0 && !syncOnlineAccountId) {
      setSyncOnlineAccountId(onlineAccounts[0].id)
    }
  }, [onlineAccounts, syncOnlineAccountId])

  const [prevMonth, setPrevMonth] = useState(currentMonth)

  useEffect(() => {
    const isMonthChange = currentMonth !== prevMonth
    setPrevMonth(currentMonth)
    loadAccounts(!isMonthChange && accounts.length > 0)
  }, [currentMonth, refreshKey])

  async function loadAccounts(silent = false) {
    try {
      if (!silent) setLoading(true)
      const data = await getAccountBalances(currentMonth)
      setAccounts(data)

      // Load linked accounts
      try {
        const linked = await getLinkedAccounts()
        setLinkedAccounts(linked)
      } catch (err) {
        console.error('Failed to load linked accounts:', err)
      }

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
      const accountData = {
        name: newAccount.name,
        type: newAccount.type,
        subtype: newAccount.type === 'self' ? (newAccount.subtype || 'cash') : 'other'
      }
      await createAccount(accountData)
      setNewAccount({ name: '', type: 'receivable', subtype: 'other' })
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
    setSyncWithOnline(false)
    setSyncOnlineAccountId(onlineAccounts.length > 0 ? onlineAccounts[0].id : '')
    setShowAddTransaction(accountId)
  }

  async function handleAddTransaction(e) {
    e.preventDefault()
    try {
      const amountVal = parseFloat(newTxn.amount)
      await createTransaction({
        account_id: showAddTransaction,
        amount: amountVal,
        description: newTxn.description,
        month_year: currentMonth,
        created_at: newTxn.date ? new Date(newTxn.date).toISOString() : undefined
      })

      if (syncWithOnline && selectedAccount && syncOnlineAccountId) {
        const isReceivable = selectedAccount.type === 'receivable'
        const onlineAmount = isReceivable ? -amountVal : amountVal
        const onlineDesc = newTxn.description 
          ? `${selectedAccount.name}: ${newTxn.description}` 
          : `${selectedAccount.name}`

        await createTransaction({
          account_id: syncOnlineAccountId,
          amount: onlineAmount,
          description: onlineDesc,
          month_year: currentMonth,
          created_at: newTxn.date ? new Date(newTxn.date).toISOString() : undefined
        })
      }

      setNewTxn({ amount: '', description: '', date: '' })
      setSyncWithOnline(false)
      setSyncOnlineAccountId('')
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

  const handleVerifyTransaction = async (txnId) => {
    try {
      await verifyTransaction(txnId)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to verify transaction:', err)
    }
  }

  const handleRejectTransaction = async (txnId) => {
    try {
      await rejectTransaction(txnId)
      triggerRefresh()
    } catch (err) {
      console.error('Failed to reject transaction:', err)
    }
  }

  const { filtered, totalBalance, missingDefaults } = useMemo(() => {
    const filteredAccs = accounts
      .filter(a => a.type === activeTab)
      .sort((a, b) => b.balance - a.balance)
    const total = filteredAccs.reduce((s, a) => s + a.balance, 0)

    const selfAccounts = accounts.filter(a => a.type === 'self')
    const hasCash = selfAccounts.some(a => a.subtype === 'cash')
    const hasExpense = selfAccounts.some(a => a.subtype === 'expense')
    const hasOnline = selfAccounts.some(a => a.subtype === 'online')

    const defaults = []
    if (!hasCash) defaults.push({ name: 'Cash In Hand', type: 'self', subtype: 'cash' })
    if (!hasOnline) defaults.push({ name: 'Online Money', type: 'self', subtype: 'online' })
    if (!hasExpense) defaults.push({ name: 'Expence Money', type: 'self', subtype: 'expense' })

    return {
      filtered: filteredAccs,
      totalBalance: total,
      missingDefaults: defaults
    }
  }, [accounts, activeTab])

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

  const touchStartRef = useRef(null)
  const isDraggingRef = useRef(false)

  // Ignore gestures on interactive inputs/buttons/tables/modals to avoid interference
  const shouldIgnoreGesture = (target) => {
    if (!target) return false
    const targetTag = target.tagName.toLowerCase()
    return (
      ['input', 'select', 'button', 'option', 'textarea', 'a'].includes(targetTag) ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.account-actions') ||
      target.closest('.table-wrapper') ||
      target.closest('.modal') ||
      target.closest('.confirm-modal') ||
      target.closest('.modal-overlay')
    )
  }

  const handleTouchStart = (e) => {
    if (shouldIgnoreGesture(e.target)) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    
    const minDistance = 60
    
    // Swipe must be horizontal and exceed distance threshold
    if (Math.abs(deltaX) > minDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = tabs.findIndex(t => t.key === activeTab)
      if (deltaX < 0) {
        // Swipe left -> Next tab
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1].key)
        }
      } else {
        // Swipe right -> Previous tab
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1].key)
        }
      }
    }
    touchStartRef.current = null
  }

  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Left click only
    if (shouldIgnoreGesture(e.target)) return
    touchStartRef.current = { x: e.clientX, y: e.clientY }
    isDraggingRef.current = true
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !touchStartRef.current) return
    const deltaX = e.clientX - touchStartRef.current.x
    // Prevent standard text selection when user is actively swiping/dragging tabs
    if (Math.abs(deltaX) > 10) {
      e.preventDefault()
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleMouseUp = (e) => {
    if (!isDraggingRef.current || !touchStartRef.current) return
    const deltaX = e.clientX - touchStartRef.current.x
    const deltaY = e.clientY - touchStartRef.current.y
    
    const minDistance = 60
    
    if (Math.abs(deltaX) > minDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = tabs.findIndex(t => t.key === activeTab)
      if (deltaX < 0) {
        // Dragged left -> Next tab
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1].key)
        }
      } else {
        // Dragged right -> Previous tab
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1].key)
        }
      }
    }
    
    touchStartRef.current = null
    isDraggingRef.current = false
  }

  const handleMouseLeave = () => {
    touchStartRef.current = null
    isDraggingRef.current = false
  }

  const tabs = [
    { key: 'receivable', label: 'Receivable', icon: ArrowUpRight, color: 'green' },
    { key: 'payable', label: 'Payable', icon: ArrowDownRight, color: 'red' },
    { key: 'self', label: 'Self (Cash/Online)', icon: Wallet, color: 'blue' },
  ]

  return (
    <div 
      className="animate-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ touchAction: 'pan-y' }}
    >
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

      <div key={activeTab} className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
          {filtered.map(account => {
            const isLinked = linkedAccounts.some(la => la.receivable_account_id === account.id || la.payable_account_id === account.id);
            return (
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
                      <div className="account-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {account.name}
                        {isLinked && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, background: 'var(--indigo-bg)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', padding: '1px 6px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Users size={8} /> Linked
                          </span>
                        )}
                      </div>
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
                                if (account.type === 'payable' && (txn.is_shared || isLinked)) return;
                                setEditingTransaction({
                                  id: txn.id,
                                  amount: txn.amount,
                                  description: txn.description || '',
                                  date: txn.created_at ? txn.created_at.split('T')[0] : getDefaultDate()
                                })
                              }}
                              style={{ cursor: (account.type === 'payable' && (txn.is_shared || isLinked)) ? 'default' : 'pointer' }}
                              title={(account.type === 'payable' && (txn.is_shared || isLinked)) ? '' : "Click to edit transaction"}
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
                                {account.type === 'payable' && (txn.is_shared || isLinked) ? (
                                  txn.verification_status === 'pending' ? (
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleVerifyTransaction(txn.id)}
                                        style={{ color: 'var(--green)', padding: '2px 6px', height: 'auto', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 2 }}
                                        title="Approve Transaction"
                                      >
                                        <Check size={12} /> Approve
                                      </button>
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleRejectTransaction(txn.id)}
                                        style={{ color: 'var(--red)', padding: '2px 6px', height: 'auto', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 2 }}
                                        title="Reject Transaction"
                                      >
                                        <X size={12} /> Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      <Check size={10} /> Sync Verified
                                    </span>
                                  )
                                ) : (
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
                                )}
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
                                onClick={() => setDeleteConfirm({
                                  type: 'revoke',
                                  id: account.id,
                                  label: account.name
                                })}
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
          );
        })}
        </div>
      )}
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <Modal title="New Account" onClose={() => setShowAddAccount(false)}>
          <form onSubmit={handleAddAccount}>
            <div className="form-group">
              <label htmlFor="new-acc-name" className="form-label">Name</label>
              <input
                id="new-acc-name"
                className="form-input"
                placeholder="e.g., Business, pocket cash, rent..."
                value={newAccount.name}
                onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-acc-type" className="form-label">Type</label>
              <select
                id="new-acc-type"
                className="form-select"
                value={newAccount.type}
                onChange={e => {
                  const type = e.target.value
                  setNewAccount({ ...newAccount, type, subtype: type === 'self' ? 'cash' : 'other' })
                }}
              >
                <option value="receivable">Receivable (they owe me)</option>
                <option value="payable">Payable (I owe them)</option>
                <option value="self">Self (Cash / Online)</option>
              </select>
            </div>
            {newAccount.type === 'self' && (
              <div className="form-group">
                <label htmlFor="new-acc-subtype" className="form-label">Subtype</label>
                <select
                  id="new-acc-subtype"
                  className="form-select"
                  value={newAccount.subtype || 'cash'}
                  onChange={e => setNewAccount({ ...newAccount, subtype: e.target.value })}
                >
                  <option value="cash">Cash in Hand</option>
                  <option value="online">Online Balance (e.g. UPI, Wallets)</option>
                  <option value="bank">Bank Account</option>
                  <option value="expense">Expense Pool</option>
                </select>
              </div>
            )}
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
              <label htmlFor="new-txn-date" className="form-label">Date</label>
              <input
                id="new-txn-date"
                className="form-input"
                type="date"
                value={newTxn.date}
                onChange={e => setNewTxn({ ...newTxn, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-txn-amount" className="form-label">Amount (positive = credit, negative = debit)</label>
              <input
                id="new-txn-amount"
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
              <label htmlFor="new-txn-desc" className="form-label">Description (optional)</label>
              <input
                id="new-txn-desc"
                className="form-input"
                placeholder="e.g., Grocery shopping, refund, travel..."
                value={newTxn.description}
                onChange={e => setNewTxn({ ...newTxn, description: e.target.value })}
              />
            </div>

            {selectedAccount && (selectedAccount.type === 'receivable' || selectedAccount.type === 'payable') && onlineAccounts.length > 0 && (
              <div style={{
                marginTop: 12,
                marginBottom: 16,
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)'
              }}>
                <label htmlFor="sync-online-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
                  <input
                    id="sync-online-checkbox"
                    type="checkbox"
                    checked={syncWithOnline}
                    onChange={e => setSyncWithOnline(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Sync with Online Account</span>
                </label>
                
                {syncWithOnline && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="sync-online-account-select" className="form-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Select Online Account</label>
                      <select
                        id="sync-online-account-select"
                        className="form-input"
                        value={syncOnlineAccountId}
                        onChange={e => setSyncOnlineAccountId(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px 10px', height: 'auto' }}
                      >
                        {onlineAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name} (Balance: {formatCurrency(acc.balance)})</option>
                        ))}
                      </select>
                    </div>
                    {newTxn.amount && !isNaN(parseFloat(newTxn.amount)) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>Auto-creates:</span>
                        <strong className={`amount ${getAmountClass(selectedAccount.type === 'receivable' ? -parseFloat(newTxn.amount) : parseFloat(newTxn.amount))}`}>
                          {formatCurrency(selectedAccount.type === 'receivable' ? -parseFloat(newTxn.amount) : parseFloat(newTxn.amount))}
                        </strong>
                        <span>in selected account.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
              <label htmlFor="edit-txn-date" className="form-label">Date</label>
              <input
                id="edit-txn-date"
                className="form-input"
                type="date"
                value={editingTransaction.date}
                onChange={e => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-txn-amount" className="form-label">Amount (positive = credit, negative = debit)</label>
              <input
                id="edit-txn-amount"
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
              <label htmlFor="edit-txn-desc" className="form-label">Description (optional)</label>
              <input
                id="edit-txn-desc"
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
          title={
            deleteConfirm.type === 'account' ? 'Delete Account?' : 
            deleteConfirm.type === 'transaction' ? 'Delete Transaction?' :
            'Deactivate Share Link?'
          }
          message={
            deleteConfirm.type === 'account'
              ? `Are you sure you want to delete the account "${deleteConfirm.label}" and all of its associated transactions? This action cannot be undone.`
              : deleteConfirm.type === 'transaction'
              ? `Are you sure you want to delete the transaction of ${formatCurrency(deleteConfirm.amount)} ${deleteConfirm.label ? `("${deleteConfirm.label}")` : ''}? This action cannot be undone.`
              : `Are you sure you want to deactivate the public share link for "${deleteConfirm.label}"? Anyone with this link will lose access to this shared ledger immediately.`
          }
          confirmText={deleteConfirm.type === 'revoke' ? 'Deactivate' : 'Delete'}
          onConfirm={() => {
            if (deleteConfirm.type === 'account') {
              handleDeleteAccount(deleteConfirm.id)
            } else if (deleteConfirm.type === 'transaction') {
              handleDeleteTransaction(deleteConfirm.id)
            } else if (deleteConfirm.type === 'revoke') {
              handleRevokeShare(deleteConfirm.id)
            }
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
