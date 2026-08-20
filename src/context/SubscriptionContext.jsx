/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SubscriptionContext = createContext(null)

// Plan limits configuration
const FREE_LIMITS = {
  maxAccounts: 10,
  maxSharedLinks: 3,
  hasPdfExport: false,
  hasBudgetBenchmark: false,
}

const PRO_LIMITS = {
  maxAccounts: 999999,
  maxSharedLinks: 999999,
  hasPdfExport: true,
  hasBudgetBenchmark: true,
}

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  // Optimistic free-tier defaults — app renders immediately, subscription loads in background
  const [subscription, setSubscription] = useState({
    plan: 'free',
    status: 'active',
    isPro: false,
    isTrial: false,
    trialDaysLeft: 0,
    limits: FREE_LIMITS,
    billingCycle: null,
    currentPeriodEnd: null,
  })
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchReceipts = useCallback(async () => {
    if (!user) {
      setReceipts([])
      return
    }
    try {
      const { data } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setReceipts(data || [])
    } catch (err) {
      console.error('Failed to fetch payment receipts:', err)
    }
  }, [user])

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_user_subscription')
      
      if (error) {
        console.error('Failed to fetch subscription:', error)
        // Fallback to free defaults
        setSubscription({
          plan: 'free',
          status: 'active',
          isPro: false,
          isTrial: false,
          trialDaysLeft: 0,
          limits: FREE_LIMITS,
          billingCycle: null,
          currentPeriodEnd: null,
        })
        return
      }

      const isPro = data.is_pro === true
      setSubscription({
        plan: data.plan,
        status: data.status,
        isPro,
        isTrial: data.is_trial === true,
        trialDaysLeft: data.trial_days_left || 0,
        limits: isPro ? PRO_LIMITS : FREE_LIMITS,
        billingCycle: data.billing_cycle,
        currentPeriodEnd: data.current_period_end,
      })
    } catch (err) {
      console.error('Subscription fetch error:', err)
      setSubscription({
        plan: 'free',
        status: 'active',
        isPro: false,
        isTrial: false,
        trialDaysLeft: 0,
        limits: FREE_LIMITS,
        billingCycle: null,
        currentPeriodEnd: null,
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSubscription()
    fetchReceipts()
  }, [fetchSubscription, fetchReceipts])

  // Refresh subscription after payment or plan change
  const refreshSubscription = useCallback(async () => {
    await fetchSubscription()
    await fetchReceipts()
  }, [fetchSubscription, fetchReceipts])

  // Upgrade subscription after successful payment
  const upgradeToProAfterPayment = useCallback(async (billingCycle, paymentOrderId, paymentId, paidAmountRupees = null, billingDetails = null) => {
    if (!user) return

    const now = new Date()
    const periodEnd = new Date(now)
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan: 'pro',
        status: 'active',
        billing_cycle: billingCycle,
        trial_ends_at: null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_order_id: paymentOrderId,
        payment_id: paymentId,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to upgrade subscription:', error)
      throw error
    }

    // Auto-create payment receipt record
    const receiptNo = `INV-${now.toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`
    const defaultAmount = billingCycle === 'annual' ? 1199 : 149
    const amount = (paidAmountRupees != null && !isNaN(Number(paidAmountRupees)) && Number(paidAmountRupees) > 0)
      ? Number(paidAmountRupees)
      : defaultAmount

    try {
      await supabase.from('payment_receipts').insert({
        user_id: user.id,
        receipt_number: receiptNo,
        plan: 'pro',
        billing_cycle: billingCycle,
        amount,
        currency: 'INR',
        payment_order_id: paymentOrderId,
        payment_id: paymentId,
        billing_details: billingDetails,
        created_at: now.toISOString()
      })
    } catch (rErr) {
      console.warn('Failed to insert receipt log:', rErr)
    }

    await refreshSubscription()
  }, [user, refreshSubscription])

  const value = {
    subscription,
    receipts,
    loading: loading,
    plan: subscription?.plan || 'free',
    status: subscription?.status || 'active',
    isPro: subscription?.isPro || false,
    isTrial: subscription?.isTrial || false,
    isSuspended: subscription?.status === 'suspended',
    trialDaysLeft: subscription?.trialDaysLeft || 0,
    limits: subscription?.limits || FREE_LIMITS,
    billingCycle: subscription?.billingCycle,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    refreshSubscription,
    upgradeToProAfterPayment,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
