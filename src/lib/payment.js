/**
 * Payment Integration Helper — Connects to portal-payment (SVARP) backend
 * Handles Razorpay checkout flow: create-order → open modal → verify-payment
 */

const rawPaymentUrl = (import.meta.env.VITE_PAYMENT_API_URL || 'https://api.inexarum.in/payment').replace(/\/+$/, '')
const PAYMENT_BASE_URL = rawPaymentUrl.endsWith('/api/v1') ? rawPaymentUrl.slice(0, -7) : rawPaymentUrl
const PAYMENT_API_URL = `${PAYMENT_BASE_URL}/api/v1`
const PAYMENT_API_KEY = import.meta.env.VITE_PAYMENT_API_KEY || ''
const PAYMENT_API_SECRET = import.meta.env.VITE_PAYMENT_API_SECRET || ''

// Plan pricing in paise (smallest unit for INR)
export const PLAN_PRICING = {
  pro: {
    monthly: {
      amount: 14900, // ₹149 in paise
      display: '₹149',
      label: 'per month',
    },
    annual: {
      amount: 119900, // ₹1,199 in paise
      display: '₹1,199',
      label: 'per year',
      monthlyEquivalent: '₹100',
    },
  },
}

/**
 * Load the Razorpay checkout script dynamically
 */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'))
    document.body.appendChild(script)
  })
}

function formatApiError(errorData, fallbackMessage) {
  if (!errorData) return fallbackMessage
  if (typeof errorData.detail === 'string') return errorData.detail
  if (Array.isArray(errorData.detail)) {
    return errorData.detail.map(d => `${d.loc ? d.loc.filter(l => l !== 'body').join('.') : 'field'}: ${d.msg}`).join(', ')
  }
  if (typeof errorData.detail === 'object') return JSON.stringify(errorData.detail)
  if (errorData.message) return errorData.message
  return fallbackMessage
}

/**
 * Create a payment order via portal-payment backend
 */
async function createPaymentOrder(userId, amount, currency = 'INR', billingCycle = 'monthly') {
  if (!userId) {
    throw new Error('User session invalid. Please log in again to initiate payment.')
  }
  if (!amount || amount <= 0) {
    throw new Error('Invalid payment amount.')
  }

  const response = await fetch(`${PAYMENT_API_URL}/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-key': PAYMENT_API_KEY,
      'x-app-secret': PAYMENT_API_SECRET,
    },
    body: JSON.stringify({
      user_id: String(userId),
      amount: Math.round(Number(amount)),
      currency: currency,
      plan_type: billingCycle,
      metadata_info: {
        product: 'accountize',
        plan: 'pro',
        billing_cycle: billingCycle,
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[createPaymentOrder API error]:', response.status, errorData)
    throw new Error(formatApiError(errorData, `Payment error (${response.status})`))
  }

  return response.json()
}

/**
 * Verify payment after Razorpay checkout success
 */
async function verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const response = await fetch(`${PAYMENT_API_URL}/payments/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-key': PAYMENT_API_KEY,
      'x-app-secret': PAYMENT_API_SECRET,
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[verifyPayment API error]:', response.status, errorData)
    throw new Error(formatApiError(errorData, 'Payment verification failed'))
  }

  return response.json()
}

/**
 * Report failed payment to portal-payment backend
 */
async function reportPaymentFailure(razorpayOrderId, reason) {
  try {
    await fetch(`${PAYMENT_API_URL}/payments/fail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-key': PAYMENT_API_KEY,
        'x-app-secret': PAYMENT_API_SECRET,
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        reason: reason || 'User cancelled or payment failed',
      }),
    })
  } catch (err) {
    console.error('Failed to report payment failure:', err)
  }
}

/**
 * Main payment flow: opens Razorpay checkout and handles the full lifecycle
 * 
 * @param {Object} options
 * @param {string} options.userId - Supabase user ID
 * @param {string} options.userEmail - User's email
 * @param {string} options.userName - User's display name
 * @param {string} options.billingCycle - 'monthly' or 'annual'
 * @param {Function} options.onSuccess - Callback with { orderId, paymentId, billingCycle }
 * @param {Function} options.onFailure - Callback with error message
 * @param {Function} options.onCancel - Callback when user closes modal
 */
export async function initiatePayment({
  userId,
  userEmail,
  userName,
  billingCycle = 'monthly',
  customAmountPaise = null,
  onSuccess,
  onFailure,
  onCancel,
}) {
  try {
    // 1. Load Razorpay script
    await loadRazorpayScript()

    // 2. Create order via portal-payment using custom dynamic amount or default pricing
    const defaultAmount = PLAN_PRICING.pro[billingCycle]?.amount || 14900
    const finalAmount = customAmountPaise && Number(customAmountPaise) > 0 ? Number(customAmountPaise) : defaultAmount

    const orderData = await createPaymentOrder(userId, finalAmount, 'INR', billingCycle)

    // 3. Open Razorpay checkout
    const options = {
      key: orderData.key_id,
      amount: finalAmount,
      currency: 'INR',
      name: 'Accountize',
      description: `Pro Plan — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
      order_id: orderData.razorpay_order_id,
      prefill: {
        email: userEmail || '',
        name: userName || '',
      },
      theme: {
        color: '#2a498c',
      },
      modal: {
        ondismiss: () => {
          reportPaymentFailure(orderData.razorpay_order_id, 'User closed payment modal')
          onCancel?.()
        },
      },
      handler: async (response) => {
        try {
          // 4. Verify payment
          const verification = await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          )

          if (verification.success) {
            onSuccess?.({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              billingCycle,
            })
          } else {
            onFailure?.('Payment verification failed. Please contact support.')
          }
        } catch (err) {
          console.error('Payment verification error:', err)
          onFailure?.('Payment verification failed. If amount was deducted, it will be refunded within 5-7 days.')
        }
      },
    }

    const razorpay = new window.Razorpay(options)
    
    razorpay.on('payment.failed', (response) => {
      const reason = response.error?.description || 'Payment failed'
      reportPaymentFailure(orderData.razorpay_order_id, reason)
      onFailure?.(reason)
    })

    razorpay.open()
  } catch (err) {
    console.error('Payment initiation error:', err)
    onFailure?.(err.message || 'Failed to initiate payment. Please try again.')
  }
}
