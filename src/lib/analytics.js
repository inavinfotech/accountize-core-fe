import { supabase } from './supabase'

/**
 * Clean, Decoupled Analytics Service
 * Pruned for zero noise & low DB load. Only tracks high-value business funnels & feature milestones.
 */
export const analytics = {
  // Conversion Funnels
  signUpCompleted: (email, provider = 'email') => sendEvent('signup_completed', { email, provider }),
  pwaInstalled: (platform) => sendEvent('pwa_installed', { platform: platform || navigator.userAgent }),
  onboardingCompleted: (userId) => sendEvent('onboarding_completed', { userId }),

  // Navigation & Page Views
  pageViewed: (path, title = '') => sendEvent('page_viewed', { path: String(path || '').toLowerCase(), title }),

  // High-Value Feature Milestones
  accountCreated: (accountType, subtype) => sendEvent('account_created', { type: accountType, subtype }),
  mathSplitUsed: (expression, total) => sendEvent('math_split_used', { expression, total }),
  sharedLedgerCreated: (accountType, tokenId) => sendEvent('shared_ledger_created', { type: accountType, token_id: tokenId }),
  sharedLedgerLinked: (linkId) => sendEvent('shared_ledger_linked', { link_id: linkId }),
  statementExported: (format, monthYear) => sendEvent('statement_exported', { format, month_year: monthYear }),
  mfaEnabled: () => sendEvent('mfa_enabled', {}),
  supportTicketSubmitted: (subject) => sendEvent('support_ticket_submitted', { subject }),

  // Subscription, Payment & Referral Funnels
  upgradeClicked: (reason = 'settings', billingCycle = 'monthly') => sendEvent('upgrade_clicked', { reason, billing_cycle: billingCycle }),
  paymentInitiated: (billingCycle, amount) => sendEvent('payment_initiated', { billing_cycle: billingCycle, amount }),
  paymentCompleted: (orderId, paymentId, billingCycle, amount) => sendEvent('payment_completed', { order_id: orderId, payment_id: paymentId, billing_cycle: billingCycle, amount }),
  referralLinkCopied: (referralCode) => sendEvent('referral_link_copied', { referral_code: referralCode }),
  referralCompleted: (referrerId, referralCode) => sendEvent('referral_completed', { referrer_id: referrerId, referral_code: referralCode })
}

/**
 * Low-level function to insert custom event into `analytics_events` Supabase table.
 */
export async function trackEvent(eventName, metadata = {}) {
  return sendEvent(eventName, metadata)
}

async function sendEvent(eventName, metadata = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const currentUserId = session?.user?.id || null
    const payload = {
      event_name: eventName,
      metadata,
      user_id: currentUserId
    }

    const { error } = await supabase.from('analytics_events').insert(payload)
    if (error) {
      console.warn('[Analytics] Failed to track event:', error.message)
    }
  } catch (err) {
    console.warn('[Analytics] Internal tracking error:', err)
  }
}

/**
 * Logs frontend runtime errors and unhandled promise rejections to `error_logs`.
 */
export async function logError(errorMessage, stackTrace = '', url = '') {
  const msgStr = String(errorMessage || '').toLowerCase()
  if (
    !navigator.onLine ||
    msgStr.includes('err_internet_disconnected') ||
    msgStr.includes('failed to fetch') ||
    msgStr.includes('networkerror') ||
    msgStr.includes('network request failed')
  ) {
    // Suppress logging to DB when offline to avoid recursive network fetch errors
    console.warn('[ErrorLogger] Offline network error suppressed:', errorMessage)
    return
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      error_message: String(errorMessage),
      stack_trace: String(stackTrace || ''),
      url: String(url || window.location.href).toLowerCase(),
      user_id: user?.id || null
    }

    const { error } = await supabase.from('error_logs').insert(payload)
    if (error) {
      console.warn('[ErrorLogger] Failed to insert error log:', error.message)
    }
  } catch (err) {
    console.warn('[ErrorLogger] Internal logging error:', err)
  }
}
