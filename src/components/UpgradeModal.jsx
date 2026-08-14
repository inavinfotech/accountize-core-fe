import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Crown, Check, X, Zap, Sparkles, Shield, FileText, Target, Headphones,
  Loader2, ArrowLeft, ArrowRight, Lock, Building2, MapPin, Phone, Mail, User, CheckCircle2,
  Calculator, HelpCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useSystemConfig } from '../context/SystemConfigContext'
import { initiatePayment, calculatePricing } from '../lib/payment'
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

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

export default function UpgradeModal({ isOpen, onClose, triggerReason }) {
  const { user } = useAuth()
  const { isTrial, trialDaysLeft, upgradeToProAfterPayment } = useSubscription()
  const { proMonthlyPrice, proAnnualPrice } = useSystemConfig()

  const [step, setStep] = useState('plan') // 'plan' | 'billing' | 'success'
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [showBusinessFields, setShowBusinessFields] = useState(false)
  const [showFeeTooltip, setShowFeeTooltip] = useState(false)

  // Billing details form state
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    gstin: '',
    businessName: '',
  })

  // Load saved billing details on open / user change
  useEffect(() => {
    if (!isOpen) return

    const initialName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
    const initialEmail = user?.email || ''
    const initialPhone = user?.user_metadata?.phone || user?.phone || ''

    let savedDetails = {}
    try {
      const stored = localStorage.getItem('accountize_billing_info')
      if (stored) {
        savedDetails = JSON.parse(stored)
      }
    } catch {
      // ignore JSON errors
    }

    setBillingDetails({
      name: savedDetails.name || initialName,
      email: savedDetails.email || initialEmail,
      phone: savedDetails.phone || initialPhone,
      address: savedDetails.address || '',
      city: savedDetails.city || '',
      state: savedDetails.state || 'Maharashtra',
      pincode: savedDetails.pincode || '',
      gstin: savedDetails.gstin || '',
      businessName: savedDetails.businessName || '',
    })

    if (savedDetails.gstin || savedDetails.businessName) {
      setShowBusinessFields(true)
    }

    // Reset step & errors when opened
    setStep('plan')
    setPaymentError('')
    setPaymentLoading(false)
    setShowFeeTooltip(false)
  }, [isOpen, user])

  if (!isOpen) return null

  // Pricing & Transaction Fee Calculations: ((price / 0.98) - price)
  const currentBasePrice = billingCycle === 'annual' ? proAnnualPrice : proMonthlyPrice
  const pricing = calculatePricing(currentBasePrice)

  const fullYearPrice = proMonthlyPrice * 12
  const annualSavings = fullYearPrice - proAnnualPrice
  const savingsPercent = Math.max(0, Math.round((annualSavings / fullYearPrice) * 100))

  const handleInputChange = (field, value) => {
    setBillingDetails(prev => ({ ...prev, [field]: value }))
    if (paymentError) setPaymentError('')
  }

  const validateBillingForm = () => {
    if (!billingDetails.name.trim()) {
      setPaymentError('Please enter your full name.')
      return false
    }
    if (!billingDetails.email.trim()) {
      setPaymentError('Please enter your billing email address.')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(billingDetails.email.trim())) {
      setPaymentError('Please enter a valid email address.')
      return false
    }
    if (billingDetails.phone.trim()) {
      const cleanPhone = billingDetails.phone.trim().replace(/\D/g, '')
      if (cleanPhone.length < 10) {
        setPaymentError('Please enter a valid 10-digit mobile number.')
        return false
      }
    }
    if (billingDetails.pincode.trim()) {
      const cleanPin = billingDetails.pincode.trim().replace(/\D/g, '')
      if (cleanPin.length !== 6) {
        setPaymentError('Please enter a valid 6-digit PIN code.')
        return false
      }
    }
    if (showBusinessFields && billingDetails.gstin.trim()) {
      const cleanGst = billingDetails.gstin.trim().toUpperCase()
      if (cleanGst.length !== 15) {
        setPaymentError('GSTIN must be 15 alphanumeric characters (or leave empty).')
        return false
      }
    }
    return true
  }

  const handleProceedToPayment = async (e) => {
    e?.preventDefault()
    setPaymentError('')

    if (!user || !user.id) {
      setPaymentError('Please log in to upgrade your subscription.')
      return
    }

    if (!validateBillingForm()) {
      return
    }

    // Persist billing info in localStorage
    try {
      localStorage.setItem('accountize_billing_info', JSON.stringify(billingDetails))
    } catch {
      // ignore storage errors
    }

    setPaymentLoading(true)
    analytics.upgradeClicked(triggerReason || 'upgrade_modal', billingCycle)
    analytics.paymentInitiated(billingCycle, pricing.totalPaise)

    await initiatePayment({
      userId: user.id,
      userEmail: billingDetails.email.trim(),
      userName: billingDetails.name.trim(),
      billingCycle,
      customAmountPaise: pricing.totalPaise,
      billingDetails: {
        ...billingDetails,
        basePrice: pricing.basePrice,
        transactionFee: pricing.transactionFee,
        totalPrice: pricing.totalPrice,
      },
      onSuccess: async ({ orderId, paymentId, billingCycle: cycle, amountPaid }) => {
        try {
          analytics.paymentCompleted(orderId, paymentId, cycle, pricing.totalPaise)
          await upgradeToProAfterPayment(cycle, orderId, paymentId, amountPaid || pricing.totalPrice)
          setStep('success')
          setPaymentLoading(false)
        } catch (err) {
          console.error('Subscription update error:', err)
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

  // Step 3: Success Screen
  if (step === 'success') {
    return createPortal(
      <div
        className="upgrade-fullscreen-overlay"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflowY: 'auto'
        }}
      >
        <div className="modal-content" style={{ maxWidth: 460, width: '100%', textAlign: 'center', padding: '40px 32px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div
            className="pro-icon-gold-shine"
            style={{
              width: 68, height: 68, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Crown size={36} color="white" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Welcome to Pro! 🎉
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
            Your <strong>{billingCycle === 'annual' ? 'Annual' : 'Monthly'} Pro Plan</strong> is now active. Enjoy unlimited accounts, PDF exports, budget benchmarks, and priority support.
          </p>

          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            fontSize: '0.75rem',
            textAlign: 'left',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Billed to:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{billingDetails.name || user?.email}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Total Paid:</span>
              <strong style={{ color: '#059669', fontSize: '0.85rem' }}>₹{pricing.totalPrice.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Invoice:</span>
              <span style={{ color: 'var(--text-secondary)' }}>Available in Settings &gt; Billing</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 20px', fontSize: '0.82rem', fontWeight: 700 }}
          >
            Start Using Pro
          </button>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="upgrade-fullscreen-overlay">
      <div
        className="upgrade-modal-card"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          animation: 'none',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div className="upgrade-modal-header">
          {/* Top Bar: Title Badge on Left, Steps Indicator & Close Button on Right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Crown size={18} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.9 }}>
                Accountize Pro
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {/* Step Badges */}
              <div className="checkout-step-indicator">
                <span className={`checkout-step-badge ${step === 'plan' ? 'active' : 'completed'}`}>
                  1. Plan
                </span>
                <span className="checkout-step-divider">›</span>
                <span className={`checkout-step-badge ${step === 'billing' ? 'active' : ''}`}>
                  2. Billing Details
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  borderRadius: 8, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <h2 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
            {step === 'plan' ? 'Unlock the full power of Accountize' : 'Enter Billing Details & Review Order'}
          </h2>

          {step === 'plan' && triggerReason && (
            <p style={{ fontSize: '0.7rem', opacity: 0.88, marginTop: 4, lineHeight: 1.4 }}>
              {triggerReason}
            </p>
          )}

          {step === 'plan' && isTrial && trialDaysLeft > 0 && (
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

        {/* Modal Body */}
        <div className="upgrade-modal-body">
          {/* ================= STEP 1: PLAN SELECTION ================= */}
          {step === 'plan' && (
            <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
              {/* Billing Toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, marginBottom: 20,
              }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
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
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: billingCycle === 'annual' ? 'var(--text-primary)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  Annual
                  {savingsPercent > 0 && (
                    <span style={{
                      padding: '2px 6px', borderRadius: 4,
                      background: '#ecfdf5', color: '#059669',
                      fontSize: '0.62rem', fontWeight: 800,
                    }}>
                      Save {savingsPercent}%
                    </span>
                  )}
                </span>
              </div>

              {/* Plan Cards Grid */}
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
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
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
                    onClick={() => setStep('billing')}
                    className="btn btn-primary"
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'linear-gradient(135deg, #2a498c, #1e3362)',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      transition: 'all 0.2s', marginTop: 'auto',
                    }}
                  >
                    Proceed to Billing Details
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: BILLING DETAILS & CHECKOUT REVIEW ================= */}
          {step === 'billing' && (
            <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
              {/* Back Button and Plan Summary banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setStep('plan')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', padding: '6px 12px' }}
                >
                  <ArrowLeft size={13} /> Back to Plans
                </button>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Selected: <strong style={{ color: 'var(--text-primary)' }}>Accountize Pro ({billingCycle === 'annual' ? 'Annual' : 'Monthly'})</strong>
                </div>
              </div>

              <div className="checkout-layout-grid">
                {/* Left: Billing Details Form */}
                <div className="checkout-form-column">
                  <div className="checkout-section-title">
                    <User size={15} style={{ color: '#2a498c' }} />
                    <span>Customer &amp; Billing Information</span>
                  </div>

                  <form onSubmit={handleProceedToPayment} className="checkout-form-fields">
                    <div className="form-group-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="billing-name">
                          Full Name <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <div className="input-with-icon">
                          <User size={14} className="input-icon" />
                          <input
                            id="billing-name"
                            type="text"
                            className="form-input"
                            placeholder="Your full name"
                            value={billingDetails.name}
                            onChange={e => handleInputChange('name', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="billing-email">
                          Billing Email <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <div className="input-with-icon">
                          <Mail size={14} className="input-icon" />
                          <input
                            id="billing-email"
                            type="email"
                            className="form-input"
                            placeholder="name@example.com"
                            value={billingDetails.email}
                            onChange={e => handleInputChange('email', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="billing-phone">
                          Phone Number <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(for payment receipt SMS)</span>
                        </label>
                        <div className="input-with-icon">
                          <Phone size={14} className="input-icon" />
                          <input
                            id="billing-phone"
                            type="tel"
                            className="form-input"
                            placeholder="10-digit mobile"
                            value={billingDetails.phone}
                            onChange={e => handleInputChange('phone', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="billing-pincode">
                          PIN Code
                        </label>
                        <div className="input-with-icon">
                          <MapPin size={14} className="input-icon" />
                          <input
                            id="billing-pincode"
                            type="text"
                            maxLength={6}
                            className="form-input"
                            placeholder="6-digit PIN"
                            value={billingDetails.pincode}
                            onChange={e => handleInputChange('pincode', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="billing-address">
                        Billing Street Address <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(Optional)</span>
                      </label>
                      <input
                        id="billing-address"
                        type="text"
                        className="form-input"
                        placeholder="House / Flat No., Street, Area"
                        value={billingDetails.address}
                        onChange={e => handleInputChange('address', e.target.value)}
                      />
                    </div>

                    <div className="form-group-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="billing-city">
                          City
                        </label>
                        <input
                          id="billing-city"
                          type="text"
                          className="form-input"
                          placeholder="City"
                          value={billingDetails.city}
                          onChange={e => handleInputChange('city', e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="billing-state">
                          State / UT
                        </label>
                        <select
                          id="billing-state"
                          className="form-input"
                          value={billingDetails.state}
                          onChange={e => handleInputChange('state', e.target.value)}
                        >
                          {INDIAN_STATES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Optional Business / GST details toggle */}
                    <div style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => setShowBusinessFields(prev => !prev)}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          fontSize: '0.72rem', color: '#2a498c', fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Building2 size={13} />
                        {showBusinessFields ? '− Remove business/GST details' : '+ Add business name or GSTIN (for tax invoice)'}
                      </button>

                      {showBusinessFields && (
                        <div style={{
                          marginTop: 10, padding: 12, background: 'var(--bg-primary)',
                          borderRadius: 8, border: '1px solid var(--border-color)',
                          display: 'flex', flexDirection: 'column', gap: 10,
                        }}>
                          <div className="form-group-row">
                            <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label" htmlFor="billing-business">Company / Business Name</label>
                              <input
                                id="billing-business"
                                type="text"
                                className="form-input"
                                placeholder="Business legal name"
                                value={billingDetails.businessName}
                                onChange={e => handleInputChange('businessName', e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label" htmlFor="billing-gstin">GSTIN</label>
                              <input
                                id="billing-gstin"
                                type="text"
                                maxLength={15}
                                className="form-input"
                                placeholder="15-digit GSTIN"
                                value={billingDetails.gstin}
                                onChange={e => handleInputChange('gstin', e.target.value.toUpperCase())}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right: Order Summary & Payment Button */}
                <div className="checkout-summary-column">
                  <div className="checkout-section-title">
                    <FileText size={15} style={{ color: '#2a498c' }} />
                    <span>Order Summary</span>
                  </div>

                  <div className="checkout-summary-box">
                    <div className="summary-line">
                      <span className="summary-label">
                        Accountize Pro ({billingCycle === 'annual' ? 'Annual' : 'Monthly'})
                      </span>
                      <span className="summary-value">
                        ₹{pricing.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="summary-line fee-line" style={{ position: 'relative' }}>
                      <span className="summary-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Payment Gateway &amp; Transaction Fee
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowFeeTooltip(prev => !prev)
                          }}
                          onMouseEnter={() => setShowFeeTooltip(true)}
                          onMouseLeave={() => setShowFeeTooltip(false)}
                          aria-label="Transaction fee information"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: showFeeTooltip ? '#2a498c' : 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'all 0.2s',
                            marginLeft: '2px',
                            verticalAlign: 'middle',
                            outline: 'none'
                          }}
                        >
                          <HelpCircle size={14} />
                        </button>
                      </span>
                      <span className="summary-value fee-value">
                        + ₹{pricing.transactionFee.toFixed(2)}
                      </span>

                      {showFeeTooltip && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginBottom: 8,
                          background: '#1e293b',
                          color: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          lineHeight: 1.3,
                          width: 220,
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          zIndex: 50,
                          pointerEvents: 'none'
                        }}>
                          Covers payment gateway processing fees for secure online transactions.
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            borderWidth: 5,
                            borderStyle: 'solid',
                            borderColor: '#1e293b transparent transparent transparent'
                          }} />
                        </div>
                      )}
                    </div>

                    <div className="summary-divider" />

                    <div className="summary-line total-line">
                      <span className="summary-total-label">Total Payable</span>
                      <span className="summary-total-value">
                        ₹{pricing.totalPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="summary-pricing-note">
                      Base price ₹{pricing.basePrice} + 2% gateway transaction charge
                    </div>

                    {paymentError && (
                      <div style={{
                        marginTop: 12, padding: '8px 12px',
                        background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: 6, fontSize: '0.72rem', color: '#dc2626',
                        lineHeight: 1.4,
                      }}>
                        {paymentError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleProceedToPayment}
                      disabled={paymentLoading}
                      className="btn btn-primary"
                      style={{
                        width: '100%', padding: '12px 14px',
                        background: paymentLoading ? 'var(--text-muted)' : 'linear-gradient(135deg, #2a498c, #1e3362)',
                        color: 'white', border: 'none', borderRadius: 8,
                        fontSize: '0.78rem', fontWeight: 800, cursor: paymentLoading ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        transition: 'all 0.2s', marginTop: 14,
                        boxShadow: '0 4px 12px rgba(42, 73, 140, 0.25)',
                      }}
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Opening Payment...
                        </>
                      ) : (
                        <>
                          <Lock size={14} />
                          Pay ₹{pricing.totalPrice.toFixed(2)}
                        </>
                      )}
                    </button>

                    <div className="checkout-trust-badges">
                      <div className="trust-item">
                        <Shield size={12} style={{ color: '#059669' }} />
                        <span>256-Bit SSL Encryption</span>
                      </div>
                      <div className="trust-item">
                        <CheckCircle2 size={12} style={{ color: '#2a498c' }} />
                        <span>UPI • Cards • NetBanking • Wallets</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Security Note (Only on Plan Step) */}
          {step === 'plan' && (
            <div style={{
              marginTop: 14, textAlign: 'center',
              fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.5,
            }}>
              <Shield size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Secure payment via Razorpay. Cancel anytime. Transparent pricing with gateway fee breakdown.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
