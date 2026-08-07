import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { analytics } from '../lib/analytics'
import {
  Receipt, Users, ShieldCheck, ArrowRight, ArrowLeft, Check, X,
  ArrowUpRight, ArrowDownRight, CheckCircle2
} from 'lucide-react'

// Visual Graphics for 3-Slide Benefit Tour

// Slide 1 Graphic: Daily Expenses & Quick Tracking
function GraphicDailyExpenses() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--indigo-bg) 100%)',
      border: '1px solid var(--indigo-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Today's Expenses</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--red)' }}>-₹230.00</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{
          background: 'var(--red-bg)',
          border: '1px solid var(--red-border)',
          color: 'var(--red)',
          borderRadius: '20px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          ₹80.00 · Lunch
        </div>
        <div style={{
          background: 'var(--red-bg)',
          border: '1px solid var(--red-border)',
          color: 'var(--red)',
          borderRadius: '20px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          ₹150.00 · Transport
        </div>
        <div style={{
          background: 'var(--indigo-bg)',
          border: '1px dashed var(--indigo-border)',
          color: 'var(--indigo)',
          borderRadius: '20px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          + Add Expense
        </div>
      </div>
    </div>
  )
}

// Slide 2 Graphic: Receivables & Payables
function GraphicPeersAndLedger() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--green-bg) 100%)',
      border: '1px solid var(--green-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Receivable */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ArrowUpRight size={14} color="var(--green)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Receivable</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--green)' }}>+₹1,500.00</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Owed by Friend</div>
        </div>

        {/* Payable */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ArrowDownRight size={14} color="var(--red)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Payable</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--red)' }}>-₹500.00</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Owed to Vendor</div>
        </div>
      </div>
    </div>
  )
}

// Slide 3 Graphic: Monthly Audit & Verification
function GraphicMonthlyCheck() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--blue-bg) 100%)',
      border: '1px solid var(--blue-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Audit Snapshot</span>
        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem' }}>
          <CheckCircle2 size={12} /> 100% Balanced
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '10px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>App Cash Records</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--green)' }}>₹12,400.00</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '10px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Actual Physical Balance</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--blue)' }}>₹12,400.00</div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingWizard() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (!user?.id) return
    const key = `accountize_onboarded_${user.id}`
    const hasOnboarded = localStorage.getItem(key)
    if (hasOnboarded) return

    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
      setIsOpen(true)
    }, 400)

    return () => clearTimeout(timer)
  }, [user?.id])

  // Custom event listener to trigger onboarding anytime from top menu
  useEffect(() => {
    const handleOpenTrigger = () => {
      setCurrentStep(1)
      window.scrollTo(0, 0)
      setIsOpen(true)
    }

    window.addEventListener('accountize:open-onboarding', handleOpenTrigger)
    return () => window.removeEventListener('accountize:open-onboarding', handleOpenTrigger)
  }, [])

  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, 0)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`accountize_onboarded_${user.id}`, 'true')
    }
    document.body.style.overflow = ''
    setIsOpen(false)
    analytics.onboardingCompleted(user?.id)
  }

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`accountize_onboarded_${user.id}`, 'true')
    }
    document.body.style.overflow = ''
    setIsOpen(false)
  }

  if (!isOpen) return null

  const TOTAL_STEPS = 3

  return createPortal(
    <div
      className="animate-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={handleSkip}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          padding: '28px 24px 24px 24px',
          position: 'relative',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: 'min(92dvh, 650px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto',
          margin: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close / Skip button */}
        <button
          onClick={handleSkip}
          title="Skip tour"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 6,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={16} />
        </button>

        {/* Step Indicator Progress Bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--indigo)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Welcome Tour • Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                style={{
                  height: 5,
                  borderRadius: 3,
                  flex: 1,
                  background: currentStep >= step ? 'var(--indigo)' : 'var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Daily Expenses */}
        {currentStep === 1 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--indigo-bg)',
              border: '1px solid var(--indigo-border)',
              color: 'var(--indigo)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <Receipt size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              1. Track Daily Expenses
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              Quickly record daily spending on the go. View expenses grouped by date and track your monthly budget effortlessly.
            </p>

            <GraphicDailyExpenses />
          </div>
        )}

        {/* STEP 2: Receivables & Payables */}
        {currentStep === 2 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--green-bg)',
              border: '1px solid var(--green-border)',
              color: 'var(--green)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <Users size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              2. Track Owed Money &amp; Liabilities
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              Never forget who owes you money (Receivables) or who you owe (Payables). Manage balances with friends and vendors clearly.
            </p>

            <GraphicPeersAndLedger />
          </div>
        )}

        {/* STEP 3: Monthly Audit & Check */}
        {currentStep === 3 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--blue-bg)',
              border: '1px solid var(--blue-border)',
              color: 'var(--blue)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <ShieldCheck size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              3. Audit &amp; Reconcile Monthly
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              Cross-check recorded assets against actual cash and bank accounts every month to keep your financial records 100% accurate.
            </p>

            <GraphicMonthlyCheck />
          </div>
        )}

        {/* Controls & Footer Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
          {currentStep > 1 ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSkip}
              style={{ color: 'var(--text-muted)' }}
            >
              Skip Tour
            </button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCurrentStep(prev => prev + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Next Step <ArrowRight size={14} />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleComplete}
              style={{ background: 'var(--green)', borderColor: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={14} /> Start Managing Wealth
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
