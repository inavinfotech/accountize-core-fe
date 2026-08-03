import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { analytics } from '../lib/analytics'
import {
  Wallet, Calculator, Share2, ShieldCheck, CheckCircle2,
  ArrowRight, ArrowLeft, Check, X, Sparkles, TrendingUp,
  Scale, Lock, Key, Users
} from 'lucide-react'

// Custom Graphics Components (SVGs & Interactive Displays)

// Graphic 1: Account Structure & Double-Entry Flow
function GraphicAccountStructure() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(30,27,75,0.4) 100%)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '18px 16px',
      marginBottom: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {/* Self Accounts */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '12px 10px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>
            1. Self
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            Cash &amp; Bank
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Physical &amp; Online Balances
          </div>
        </div>

        {/* Receivables */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '12px',
          padding: '12px 10px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#6366f1', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>
            2. Receivable
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            Money Owed To You
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Friends &amp; Client Assets
          </div>
        </div>

        {/* Payables */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '12px',
          padding: '12px 10px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>
            3. Payable
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            Money You Owe
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Vendors &amp; Liabilities
          </div>
        </div>
      </div>

      {/* Net Balance Formula Bar */}
      <div style={{
        marginTop: '14px',
        padding: '8px 12px',
        background: 'var(--bg-primary)',
        borderRadius: '8px',
        border: '1px dashed var(--border-color)',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--text-secondary)'
      }}>
        <span>Net Balance Equation:</span>
        <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
          (Self + Receivables) - Payables
        </span>
      </div>
    </div>
  )
}

// Graphic 2: Monthly Audit Verification Graphic
function GraphicMonthlyAudit() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(16,185,129,0.05) 100%)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '18px 16px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scale size={18} color="#10b981" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Monthly Audit Snapshot</span>
        </div>
        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} /> Zero Fault Verified
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-primary)', padding: '10px 6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Recorded Assets</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>₹24,500.00</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '10px 6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Actual Physical</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3b82f6' }}>₹24,500.00</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '10px 6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Discrepancy Fault</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>₹0.00</div>
        </div>
      </div>
    </div>
  )
}

// Graphic 4: Collaborative Peer Link & Dual Verification Graphic
function GraphicSharedLedger() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(99,102,241,0.06) 100%)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '18px 16px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        {/* User A */}
        <div style={{ flex: 1, background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>You (Receivable)</div>
          <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>+₹1,500.00</div>
        </div>

        {/* Sync Arrow */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Share2 size={16} color="#6366f1" />
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>Dual Sync</span>
        </div>

        {/* User B */}
        <div style={{ flex: 1, background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Partner (Payable)</div>
          <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>-₹1,500.00</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>1. Pending Partner Verification</span>
        <span>→</span>
        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>2. Dual Verified</span>
      </div>
    </div>
  )
}

// Graphic 5: Security & Sovereignty
function GraphicSecurity() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(99,102,241,0.08) 100%)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '18px 16px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={20} color="#6366f1" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>2FA Protection</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Authenticator TOTP</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Key size={20} color="#f59e0b" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Backup Codes</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Emergency Recovery</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingWizard() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [demoMath, setDemoMath] = useState('1200 + 450 / 2')
  const [calculatedValue, setCalculatedValue] = useState(1425)

  useEffect(() => {
    if (!user?.id) return
    const key = `accountify_onboarded_${user.id}`
    const hasOnboarded = localStorage.getItem(key)
    if (hasOnboarded) return

    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
      setIsOpen(true)
    }, 400)

    return () => clearTimeout(timer)
  }, [user?.id])

  // Custom event listener to trigger onboarding anytime from the top 3-dot menu
  useEffect(() => {
    const handleOpenTrigger = () => {
      setCurrentStep(1)
      window.scrollTo(0, 0)
      setIsOpen(true)
    }

    window.addEventListener('accountify:open-onboarding', handleOpenTrigger)
    return () => window.removeEventListener('accountify:open-onboarding', handleOpenTrigger)
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

  const handleMathChange = (val) => {
    setDemoMath(val)
    try {
      const cleaned = val.replace(/[^0-9+\-*/.]/g, '')
      if (cleaned) {
        // eslint-disable-next-line no-eval
        const res = Function(`"use strict"; return (${cleaned})`)()
        if (typeof res === 'number' && !isNaN(res)) {
          setCalculatedValue(res)
        }
      }
    } catch {
      // Keep previous valid value on syntax error
    }
  }

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`accountify_onboarded_${user.id}`, 'true')
    }
    document.body.style.overflow = ''
    setIsOpen(false)
    analytics.onboardingCompleted(user?.id)
  }

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`accountify_onboarded_${user.id}`, 'true')
    }
    document.body.style.overflow = ''
    setIsOpen(false)
  }

  if (!isOpen) return null

  const TOTAL_STEPS = 5

  return createPortal(
    <div
      className="animate-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
          maxWidth: '580px',
          width: '100%',
          padding: '28px 28px 24px 28px',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          maxHeight: 'min(92dvh, 700px)',
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
          title="Skip onboarding"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
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
            <span style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Financial Guide • Step {currentStep} of {TOTAL_STEPS}
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
                  background: currentStep >= step ? 'var(--accent-gradient)' : 'var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Double-Entry Architecture */}
        {currentStep === 1 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2))',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <Wallet size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              1. Double-Entry Asset Architecture
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              Accountify structures your finances using accounting precision. Separate your funds into <strong>Self</strong> (Cash &amp; Bank), <strong>Receivables</strong> (Money owed to you), and <strong>Payables</strong> (Money you owe).
            </p>

            <GraphicAccountStructure />
          </div>
        )}

        {/* STEP 2: Daily Expenses & Monthly Fault Verification */}
        {currentStep === 2 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))',
              color: '#10b981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <Scale size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              2. Expense Tracking &amp; Monthly Audit
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              Log daily expenses on the go. At the end of every month, run a <strong>Monthly Verification Audit</strong> to compare recorded assets against physical cash and detect balance discrepancies.
            </p>

            <GraphicMonthlyAudit />
          </div>
        )}

        {/* STEP 3: Fast Inline Math Engine */}
        {currentStep === 3 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
              color: '#3b82f6',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <Calculator size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              3. Built-in Math &amp; Bill Splitting
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              No need to switch to an external calculator! Type mathematical expressions like <code>1200 + 450 / 2</code> directly into any transaction field for automatic evaluation.
            </p>

            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              padding: '18px',
              borderRadius: '16px',
              marginBottom: '20px'
            }}>
              <label style={{ textAlign: 'left', display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Try typing a math expression:
              </label>
              <input
                type="text"
                className="search-input"
                value={demoMath}
                onChange={e => handleMathChange(e.target.value)}
                style={{ fontSize: '1.15rem', fontWeight: 800, textAlign: 'center', width: '100%', marginBottom: 10, padding: '10px' }}
              />
              <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Sparkles size={16} /> Total: ₹{calculatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Shared Ledgers & Dual Sync */}
        {currentStep === 4 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(245,158,11,0.2))',
              color: '#6366f1',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <Share2 size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              4. Shared Ledgers &amp; Dual Verification
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              Share unique ledger links with roommates or business partners. When transactions are created, both parties receive dual-verification entries to ensure 100% mutual trust.
            </p>

            <GraphicSharedLedger />
          </div>
        )}

        {/* STEP 5: Privacy Sovereignty & Security */}
        {currentStep === 5 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(99,102,241,0.2))',
              color: '#10b981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <ShieldCheck size={26} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              5. Enterprise Privacy &amp; 2FA Protection
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              Your financial data is private and secure. Enable <strong>Authenticator 2FA (TOTP)</strong> and generate <strong>Backup Recovery Codes</strong> under Account Settings for emergency access.
            </p>

            <GraphicSecurity />
          </div>
        )}

        {/* Controls & Footer Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, pt: 12, borderTop: '1px solid var(--border-color)' }}>
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
              Skip Onboarding
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
              style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}
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
