/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const [userAccounts, setUserAccounts] = useState([])
  const [linkedAccounts, setLinkedAccounts] = useState([])
  const activeUserRef = useRef(null)

  // Load notifications from localStorage on mount/user change
  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUserAccounts([])
      setLinkedAccounts([])
      activeUserRef.current = null
      return
    }

    activeUserRef.current = user

    // Load saved notifications
    const saved = localStorage.getItem(`notifications_${user.id}`)
    if (saved) {
      try {
        setNotifications(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse notifications', e)
      }
    } else {
      setNotifications([])
    }

    // Fetch accounts, links, and existing pending transactions
    async function loadMetadataAndPending() {
      try {
        const [accRes, linkRes, txRes] = await Promise.all([
          supabase.from('accounts').select('id, name, type'),
          supabase.from('linked_accounts').select('*'),
          supabase.from('transactions')
            .select('id, amount, description, account_id, created_at, verification_status, linked_transaction_id')
            .eq('verification_status', 'pending')
        ])

        const accountsData = accRes.data || []
        setUserAccounts(accountsData)
        if (linkRes.data) setLinkedAccounts(linkRes.data)

        // Find pending transactions on our accounts that are replicas (require our approval)
        const myAccountIds = accountsData.map(a => a.id)
        const links = linkRes.data || []
        const myPayableAccountIds = links
          .filter(l => myAccountIds.includes(l.payable_account_id))
          .map(l => l.payable_account_id)

        const myPending = (txRes.data || []).filter(
          t => myPayableAccountIds.includes(t.account_id) && t.linked_transaction_id
        )

        setNotifications(prev => {
          const nonPending = prev.filter(n => n.type !== 'pending')
          const pendingKeep = prev.filter(n => n.type === 'pending' && myPending.some(p => p.id === n.txId))
          const updated = [...nonPending, ...pendingKeep]

          myPending.forEach(txn => {
            const exists = updated.some(n => n.txId === txn.id)
            if (!exists) {
              const accountName = accountsData.find(a => a.id === txn.account_id)?.name || 'Unknown Account'
              updated.push({
                id: `db_${txn.id}`,
                timestamp: txn.created_at || new Date().toISOString(),
                read: false,
                type: 'pending',
                title: 'Pending Approval',
                message: `New transaction of ₹${Math.abs(txn.amount)} in "${accountName}" requires your approval.`,
                txId: txn.id
              })
            }
          })
          return updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        })
      } catch (err) {
        console.error('Failed to load notification metadata and pending transactions:', err)
      }
    }
    // Fetch accounts, links, and existing pending transactions
    // Deferred to avoid blocking initial page paint (3 API calls)
    const deferTimer = setTimeout(() => {
      loadMetadataAndPending()
    }, 500)
    return () => { clearTimeout(deferTimer) }
  }, [user])

  // Save to localStorage when notifications change
  useEffect(() => {
    if (user && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications))
    } else if (user) {
      localStorage.removeItem(`notifications_${user.id}`)
    }
  }, [notifications, user])

  // Add toast
  const addToast = useCallback((toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, ...toast }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  // Add notification
  const addNotification = useCallback((notification) => {
    const newNotif = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    }
    setNotifications(prev => [newNotif, ...prev])
    addToast({
      type: notification.type,
      title: notification.title,
      message: notification.message
    })
  }, [addToast])

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Realtime Subscriptions
  useEffect(() => {
    if (!user) return

    // Helper to get account name
    const getAccountName = (accId) => {
      const acc = userAccounts.find(a => a.id === accId)
      return acc ? acc.name : 'Unknown Account'
    }

    // Helper to check if account is a payable account in linked accounts
    const isPayable = (accId) => {
      return linkedAccounts.some(
        l => l.payable_account_id === accId && userAccounts.some(a => a.id === l.payable_account_id)
      )
    }

    // Subscribe to transactions changes
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        async (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload

          // 1. Handle INSERT (New Transaction)
          if (eventType === 'INSERT') {
            const isOurPayableAccount = isPayable(newRow.account_id)
            const isReplicaPending = newRow.verification_status === 'pending' && newRow.linked_transaction_id

            if (isOurPayableAccount && isReplicaPending) {
              const accountName = getAccountName(newRow.account_id)
              addNotification({
                type: 'pending',
                title: 'Pending Approval',
                message: `New transaction of ₹${Math.abs(newRow.amount)} in "${accountName}" requires your approval.`,
                txId: newRow.id
              })
            }
          }

          // 2. Handle UPDATE (Approval / Edit / Re-approval)
          if (eventType === 'UPDATE') {
            // If the transaction is no longer pending (e.g. approved/rejected), clean up its pending notification
            if (newRow.verification_status === 'completed' || newRow.verification_status === 'rejected') {
              setNotifications(prev => prev.filter(n => !(n.type === 'pending' && n.txId === newRow.id)))
            }

            const isOurAccount = userAccounts.some(a => a.id === newRow.account_id)
            if (isOurAccount) {
              // Case A: Partner Approved our transaction (partner_verified changes false -> true on our original transaction)
              if (newRow.user_id === user.id && newRow.is_shared && !oldRow.partner_verified && newRow.partner_verified) {
                const accountName = getAccountName(newRow.account_id)
                addNotification({
                  type: 'approved',
                  title: 'Transaction Approved',
                  message: `Your transaction of ₹${Math.abs(newRow.amount)} in "${accountName}" was approved by your partner.`,
                  txId: newRow.id
                })
              }
              // Case B: Partner edited a transaction, changing verification_status completed -> pending on our replica
              else if (newRow.user_id === user.id && isPayable(newRow.account_id) && oldRow.verification_status === 'completed' && newRow.verification_status === 'pending') {
                const accountName = getAccountName(newRow.account_id)
                addNotification({
                  type: 'pending',
                  title: 'Transaction Edited',
                  message: `A transaction in "${accountName}" was updated by your partner and requires your verification.`,
                  txId: newRow.id
                })
              }
            }
          }

          // 3. Handle DELETE (Rejection / Cancelation)
          if (eventType === 'DELETE') {
            // Always remove any pending notification for the deleted transaction
            setNotifications(prev => prev.filter(n => n.txId !== oldRow.id))

            const isOurAccount = userAccounts.some(a => a.id === oldRow.account_id)
            if (isOurAccount) {
              // Case C: Transaction Rejected (pending transaction got deleted)
              if (oldRow.user_id === user.id && oldRow.is_shared && !oldRow.partner_verified) {
                const accountName = getAccountName(oldRow.account_id)
                addNotification({
                  type: 'rejected',
                  title: 'Transaction Rejected',
                  message: `Your transaction of ₹${Math.abs(oldRow.amount)} in "${accountName}" was rejected/deleted by your partner.`
                })
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, userAccounts, linkedAccounts, addNotification])

  const unreadCount = notifications.filter(n => !n.read).length

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    toasts,
    addNotification,
    addToast,
    markAsRead,
    markAllAsRead,
    clearAll
  }), [notifications, unreadCount, toasts, addNotification, addToast, markAsRead, markAllAsRead, clearAll])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
