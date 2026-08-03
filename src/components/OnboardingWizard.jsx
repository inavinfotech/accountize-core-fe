import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { analytics } from '../lib/analytics'
import { Sparkles, Calculator, Share2, Wallet, ArrowRight, Check, X } from 'lucide-react'

export default function OnboardingWizard() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [demoMath, setDemoMath] = useState('200+150+50')
  const [calculatedValue, setCalculatedValue] = useState(400)

  useEffect(() => {
    if (!user?.id) return
    const key = `accountify_onboarded_${user.id}`
    const hasOnboarded = localStorage.getItem(key)
    if (hasOnboarded) return

    // Small delay to ensure the dashboard has fully rendered before showing overlay
    const timer = setTimeout(() => {
      console.log('[Onboarding] First-time user detected, showing wizard for:', user.id)
      window.scrollTo(0, 0)
      setIsOpen(true)
    }, 400)

    return () => clearTimeout(timer)
  }, [user?.id])

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
      // Safe math evaluator for demo
      const cleaned = val.replace(/[^0-9+\-*/.]/g, '')
      if (cleaned) {
        // eslint-disable-next-line no-eval
        const res = Function(`"use strict"; return (${cleaned})`)()
        if (typeof res === 'number' && !isNaN(res)) {
          setCalculatedValue(res)
        }
      }
    } catch {
      // Keep previous value on syntax error
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

  return createPortal(
    <div
      className="animate-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          borderRadius: '20px',
          maxWidth: '520px',
          width: '100%',
          padding: '28px 24px 24px 24px',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          maxHeight: 'min(90dvh, 640px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto',
          margin: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleSkip}
          title="Skip guide"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              style={{
                height: 6,
                borderRadius: 3,
                width: currentStep === step ? 32 : 12,
                background: currentStep >= step ? 'var(--primary)' : 'var(--border)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* STEP 1: Add Accounts */}
        {currentStep === 1 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--indigo-bg)',
              color: 'var(--indigo)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Wallet size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
              1. Add Your Core Cash &amp; Bank Accounts
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20 }}>
              Accountify uses double-entry accounting principles. Organize your money into <strong>Self</strong> (Cash &amp; Bank), <strong>Receivables</strong> (People who owe you), and <strong>Payables</strong> (People you owe).
            </p>
            <div style={{
              background: 'var(--surface-hover)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              fontSize: '0.825rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-success">Self</span> Cash in Hand &amp; Bank Accounts
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-indigo">Receivable</span> Money owed to you by friends or clients
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-warning">Payable</span> Money you owe to vendors or partners
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Math Splitting Demo */}
        {currentStep === 2 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(59,130,246,0.1)',
              color: '#3b82f6',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Calculator size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
              2. Fast Inline Math Expressions
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20 }}>
              No need to switch to a calculator app! Type math expressions like <code>200+150+50</code> directly into any transaction amount field.
            </p>

            <div style={{
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 24
            }}>
              <label className="form-label" style={{ textAlign: 'left', display: 'block', marginBottom: 6 }}>
                Try typing math below:
              </label>
              <input
                type="text"
                className="form-input"
                value={demoMath}
                onChange={e => handleMathChange(e.target.value)}
                style={{ fontSize: '1.1rem', fontWeight: 600, textAlign: 'center', marginBottom: 10 }}
              />
              <div style={{ fontSize: '0.875rem', color: 'var(--green)', fontWeight: 600 }}>
                Calculated Total: ₹{calculatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Shared Ledgers */}
        {currentStep === 3 && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)',
              color: 'var(--green)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Share2 size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
              3. Share Ledgers &amp; Dual Verify
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20 }}>
              Share unique links with roommates or business partners. When transactions are added, both parties receive instant dual-verification sync!
            </p>

            <div style={{
              background: 'var(--green-bg)',
              border: '1px solid var(--green-border)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              fontSize: '0.825rem',
              color: 'var(--green)',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <Sparkles size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong>Zero Password Link Sharing</strong> — Partners can link payable accounts directly via secret token links.
              </div>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={handleSkip}
            style={{ fontSize: '0.85rem' }}
          >
            Skip Guide
          </button>

          {currentStep < 3 ? (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentStep(prev => prev + 1)}
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleComplete}
              style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
            >
              <Check size={14} /> Got It! Get Started
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
