/**
 * Payment Integration Helper — Connects to portal-payment (SVARP) backend
 * Handles Razorpay checkout flow: create-order → open modal → verify-payment
 */

const rawPaymentUrl = (import.meta.env.VITE_PAYMENT_API_URL || 'https://api.inexarum.in/payment').replace(/\/+$/, '')
const PAYMENT_BASE_URL = rawPaymentUrl.endsWith('/api/v1') ? rawPaymentUrl.slice(0, -7) : rawPaymentUrl
const PAYMENT_API_URL = `${PAYMENT_BASE_URL}/api/v1`
const PAYMENT_API_KEY = import.meta.env.VITE_PAYMENT_API_KEY || ''
const PAYMENT_API_SECRET = import.meta.env.VITE_PAYMENT_API_SECRET || ''

function getPaymentHeaders() {
  const key = import.meta.env.VITE_PAYMENT_API_KEY || PAYMENT_API_KEY
  const secret = import.meta.env.VITE_PAYMENT_API_SECRET || PAYMENT_API_SECRET
  return {
    'Content-Type': 'application/json',
    'x-app-key': key,
    'x-app-secret': secret,
  }
}

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
 * Calculate pricing with transactional charge: ((price / 0.98) - price)
 * @param {number|string} basePriceRupees - The plan price in INR
 */
export function calculatePricing(basePriceRupees) {
  const base = Number(basePriceRupees) || 0
  if (base <= 0) {
    return {
      basePrice: 0,
      transactionFee: 0,
      totalPrice: 0,
      basePaise: 0,
      feePaise: 0,
      totalPaise: 0,
    }
  }

  const rawTotal = base / 0.98
  const rawFee = rawTotal - base
  const totalPaise = Math.round(rawTotal * 100)
  const basePaise = Math.round(base * 100)
  const feePaise = totalPaise - basePaise

  return {
    basePrice: base,
    transactionFee: Number((feePaise / 100).toFixed(2)),
    totalPrice: Number((totalPaise / 100).toFixed(2)),
    basePaise,
    feePaise,
    totalPaise,
  }
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
async function createPaymentOrder(userId, amount, currency = 'INR', billingCycle = 'monthly', metadata = {}) {
  if (!userId) {
    throw new Error('User session invalid. Please log in again to initiate payment.')
  }
  if (!amount || amount <= 0) {
    throw new Error('Invalid payment amount.')
  }

  try {
    const response = await fetch(`${PAYMENT_API_URL}/payments/create-order`, {
      method: 'POST',
      headers: getPaymentHeaders(),
      body: JSON.stringify({
        user_id: String(userId),
        amount: Math.round(Number(amount)),
        currency: currency,
        plan_type: billingCycle,
        metadata_info: {
          product: 'accountize',
          plan: 'pro',
          billing_cycle: billingCycle,
          ...metadata,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[createPaymentOrder API error]:', response.status, errorData)
      throw new Error(formatApiError(errorData, `Payment error (${response.status})`))
    }

    return response.json()
  } catch (err) {
    console.error('Failed to create payment order:', err)
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Payment server is currently unreachable. Please check your internet connection or try again later.')
    }
    throw err
  }
}

/**
 * Verify payment after Razorpay checkout success
 */
async function verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  try {
    const response = await fetch(`${PAYMENT_API_URL}/payments/verify-payment`, {
      method: 'POST',
      headers: getPaymentHeaders(),
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
  } catch (err) {
    console.error('Failed to verify payment:', err)
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Payment server is currently unreachable. Please check your network connection and try again.')
    }
    throw err
  }
}

/**
 * Report failed payment to portal-payment backend
 */
async function reportPaymentFailure(razorpayOrderId, reason) {
  try {
    await fetch(`${PAYMENT_API_URL}/payments/fail`, {
      method: 'POST',
      headers: getPaymentHeaders(),
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
 * @param {number} [options.customAmountPaise] - Total amount in paise (with transaction charges)
 * @param {Object} [options.billingDetails] - Billing address & contact details
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
  billingDetails = null,
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

    const metadata = {
      customer_name: billingDetails?.name || userName || '',
      customer_email: billingDetails?.email || userEmail || '',
      customer_phone: billingDetails?.phone || '',
      billing_address: billingDetails?.address || '',
      billing_city: billingDetails?.city || '',
      billing_state: billingDetails?.state || '',
      billing_pincode: billingDetails?.pincode || '',
      billing_gstin: billingDetails?.gstin || '',
      billing_business_name: billingDetails?.businessName || '',
      base_price: billingDetails?.basePrice || '',
      transaction_fee: billingDetails?.transactionFee || '',
      total_price: billingDetails?.totalPrice || (finalAmount / 100),
    }

    const orderData = await createPaymentOrder(userId, finalAmount, 'INR', billingCycle, metadata)

    // 3. Open Razorpay checkout
    const options = {
      key: orderData.key_id,
      amount: finalAmount,
      currency: 'INR',
      name: 'Accountize',
      description: `Pro Plan — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
      order_id: orderData.razorpay_order_id,
      prefill: {
        email: billingDetails?.email || userEmail || '',
        name: billingDetails?.name || userName || '',
        contact: billingDetails?.phone || '',
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
              amountPaid: finalAmount / 100,
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
    let errMsg = err.message || 'Failed to initiate payment. Please try again.'
    if (errMsg.toLowerCase().includes('failed to fetch')) {
      errMsg = 'Payment server is currently unreachable. Please check your internet connection or try again later.'
    }
    onFailure?.(errMsg)
  }
}
