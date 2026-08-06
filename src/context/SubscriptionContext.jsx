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
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

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
  }, [fetchSubscription])

  // Refresh subscription after payment or plan change
  const refreshSubscription = useCallback(async () => {
    await fetchSubscription()
  }, [fetchSubscription])

  // Upgrade subscription after successful payment
  const upgradeToProAfterPayment = useCallback(async (billingCycle, paymentOrderId, paymentId) => {
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

    await refreshSubscription()
  }, [user, refreshSubscription])

  const value = {
    subscription,
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
