import { useState } from 'react'
import { Crown, Check, X, Zap, Sparkles, Shield, FileText, Target, Headphones, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useSystemConfig } from '../context/SystemConfigContext'
import { initiatePayment, PLAN_PRICING } from '../lib/payment'
import { analytics } from '../lib/analytics'

const FREE_FEATURES = [
  { icon: Check, text: '10 Custom Accounts' },
  { icon: Check, text: '3 Shared Ledger Links' },
  { icon: Check, text: 'Unlimited Transactions' },
  { icon: Check, text: 'Expense Tracking & Charts' },
  { icon: Check, text: 'Fault Reconciliation' },
  { icon: Check, text: 'Auto Monthly Settlement' },
  { icon: Check, text: 'Cash & Online Balance Checks' },
  { icon: Check, text: 'MFA Security' },
]

const PRO_FEATURES = [
  { icon: Sparkles, text: 'Unlimited Accounts', highlight: true },
  { icon: Sparkles, text: 'Unlimited Shared Links', highlight: true },
  { icon: FileText, text: 'PDF Financial Reports', highlight: true },
  { icon: Target, text: 'Budget Benchmarks & Alerts', highlight: true },
  { icon: Headphones, text: 'Priority Support', highlight: true },
  { icon: Check, text: 'Everything in Free' },
]

export default function UpgradeModal({ isOpen, onClose, triggerReason }) {
  const { user } = useAuth()
  const { isTrial, trialDaysLeft, upgradeToProAfterPayment } = useSubscription()
  const { proMonthlyPrice, proAnnualPrice, proMonthlyPaise, proAnnualPaise } = useSystemConfig()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  if (!isOpen) return null

  const fullYearPrice = proMonthlyPrice * 12
  const annualSavings = fullYearPrice - proAnnualPrice
  const savingsPercent = Math.max(0, Math.round((annualSavings / fullYearPrice) * 100))

  const currentPrice = billingCycle === 'annual' ? proAnnualPrice : proMonthlyPrice
  const currentAmountPaise = billingCycle === 'annual' ? proAnnualPaise : proMonthlyPaise
  const displayPrice = `₹${currentPrice.toLocaleString('en-IN')}`
  const priceLabel = billingCycle === 'annual' ? 'per year' : 'per month'
  const monthlyEquivalent = billingCycle === 'annual' ? `₹${Math.round(proAnnualPrice / 12)}` : null

  const handleUpgrade = async () => {
    setPaymentError('')

    if (!user || !user.id) {
      setPaymentError('Please log in to upgrade your subscription.')
      return
    }

    setPaymentLoading(true)

    analytics.upgradeClicked(triggerReason || 'upgrade_modal', billingCycle)
    analytics.paymentInitiated(billingCycle, currentAmountPaise)

    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''

    await initiatePayment({
      userId: user.id,
      userEmail: user.email,
      userName: displayName,
      billingCycle,
      customAmountPaise: currentAmountPaise,
      onSuccess: async ({ orderId, paymentId, billingCycle: cycle }) => {
        try {
          analytics.paymentCompleted(orderId, paymentId, cycle, currentAmountPaise)
          await upgradeToProAfterPayment(cycle, orderId, paymentId)
          setPaymentSuccess(true)
          setPaymentLoading(false)
        } catch (err) {
          setPaymentError('Payment processed but subscription update failed. Please contact support.')
          setPaymentLoading(false)
        }
      },
      onFailure: (errorMsg) => {
        setPaymentError(errorMsg)
        setPaymentLoading(false)
      },
      onCancel: () => {
        setPaymentLoading(false)
      },
    })
  }

  if (paymentSuccess) {
    return (
      <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: 440, textAlign: 'center', padding: '40px 32px' }} onClick={e => e.stopPropagation()}>
          <div
            className="pro-icon-gold-shine"
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
            }}
          >
            <Crown size={32} color="white" />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            Welcome to Pro! 🎉
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
            Your Pro plan is now active. Enjoy unlimited accounts, PDF exports, budget benchmarks, and priority support.
          </p>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 20px', fontSize: '0.8rem', fontWeight: 700 }}
          >
            Start Using Pro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, padding: '12px' }} onClick={onClose}>
      <div
        className="upgrade-modal-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="upgrade-modal-header">
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
              transition: 'background 0.2s',
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Crown size={20} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.9 }}>
              Upgrade to Pro
            </span>
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
            Unlock the full power of Accountize
          </h2>
          {triggerReason && (
            <p style={{ fontSize: '0.7rem', opacity: 0.88, marginTop: 4, lineHeight: 1.4 }}>
              {triggerReason}
            </p>
          )}
          {isTrial && trialDaysLeft > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.18)', borderRadius: 6,
              padding: '4px 10px', marginTop: 8, fontSize: '0.68rem', fontWeight: 600,
            }}>
              <Zap size={12} />
              Pro Trial — {trialDaysLeft} days remaining
            </div>
          )}
        </div>

        {/* Body */}
        <div className="upgrade-modal-body">
          {/* Billing Toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, marginBottom: 20,
          }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly')}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: '#2a498c', border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
              aria-label="Toggle billing cycle"
            >
              <span style={{
                position: 'absolute', top: 3, left: billingCycle === 'annual' ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s',
              }} />
            </button>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: billingCycle === 'annual' ? 'var(--text-primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              Annual
              {savingsPercent > 0 && (
                <span style={{
                  padding: '2px 6px', borderRadius: 4,
                  background: '#ecfdf5', color: '#059669',
                  fontSize: '0.6rem', fontWeight: 800,
                }}>
                  Save {savingsPercent}%
                </span>
              )}
            </span>
          </div>

          {/* Plan Comparison Grid */}
          <div className="upgrade-plan-grid">
            {/* Free Card */}
            <div style={{
              border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 16px',
              background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column',
            }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                Free Plan
              </h3>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                ₹0 <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>forever</span>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Your current plan
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {FREE_FEATURES.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <f.icon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Card */}
            <div style={{
              border: '2px solid #2a498c', borderRadius: 14, padding: '18px 16px',
              background: 'var(--bg-secondary)', position: 'relative', display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 14px 0 rgba(42, 73, 140, 0.12)',
            }}>
              <span style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                background: '#2a498c', color: 'white', padding: '2px 10px',
                borderRadius: 4, fontSize: '0.58rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
              }}>
                Recommended
              </span>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2a498c', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                Pro Plan
              </h3>

              {billingCycle === 'annual' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    {annualSavings > 0 && (
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600 }}>
                        ₹{fullYearPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ₹{proAnnualPrice.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      per year
                    </span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600, marginBottom: 14 }}>
                    Just ₹{Math.round(proAnnualPrice / 12)}/month {annualSavings > 0 ? `(Save ₹${annualSavings.toLocaleString('en-IN')})` : ''}
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                    ₹{proMonthlyPrice.toLocaleString('en-IN')}{' '}
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      per month
                    </span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Billed monthly
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18, flex: 1 }}>
                {PRO_FEATURES.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.72rem',
                    color: f.highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: f.highlight ? 600 : 400,
                  }}>
                    <f.icon size={13} style={{ color: f.highlight ? '#2a498c' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleUpgrade}
                disabled={paymentLoading}
                style={{
                  width: '100%', padding: '11px 14px',
                  background: paymentLoading ? 'var(--text-muted)' : 'linear-gradient(135deg, #2a498c, #1e3362)',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontSize: '0.72rem', fontWeight: 700, cursor: paymentLoading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  transition: 'all 0.2s', marginTop: 'auto',
                }}
              >
                {paymentLoading ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown size={14} />
                    Upgrade to Pro — {displayPrice}
                  </>
                )}
              </button>
            </div>
          </div>

          {paymentError && (
            <div style={{
              marginTop: 14, padding: '10px 14px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, fontSize: '0.72rem', color: '#dc2626',
            }}>
              {paymentError}
            </div>
          )}

          <div style={{
            marginTop: 14, textAlign: 'center',
            fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.5,
          }}>
            <Shield size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Secure payment via Razorpay. Cancel anytime. No hidden fees.
          </div>
        </div>
      </div>
    </div>
  )
}
