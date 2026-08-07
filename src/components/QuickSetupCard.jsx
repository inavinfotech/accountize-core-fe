import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ArrowRight, X, Sparkles } from 'lucide-react'

export default function QuickSetupCard({ data, user }) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  const storageKey = user?.id ? `accountize_dismiss_setup_${user.id}` : null

  useEffect(() => {
    if (!storageKey) return
    const isDismissed = localStorage.getItem(storageKey) === 'true'
    if (isDismissed) {
      setDismissed(true)
    }
  }, [storageKey])

  if (!data || dismissed) return null

  // Calculate step completion based on user data
  const step1Done = (data.cashBalance || 0) > 0 || (data.rawOnlineBalance || 0) > 0 || (data.bankBalance || 0) > 0
  const step2Done = data.expenses && data.expenses.length > 0
  const step3Done = data.receivables && data.receivables.length > 0

  // Hide automatically if all steps are completed
  if (step1Done && step2Done && step3Done) {
    return null
  }

  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0)
  const progressPercent = Math.round((completedCount / 3) * 100)

  const handleDismiss = () => {
    setDismissed(true)
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
  }

  return (
    <div
      className="card mb-24 animate-in"
      style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--indigo-bg) 100%)',
        border: '1px solid var(--indigo-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--indigo-bg)',
            border: '1px solid var(--indigo-border)',
            color: 'var(--indigo)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Quick Setup Checklist
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Complete 3 quick steps to get your finances fully organized ({completedCount}/3 completed)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Dismiss setup guide"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--accent-gradient)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      {/* Checklist items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Step 1: Starting Balance */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: step1Done ? 'var(--green-bg)' : 'var(--bg-secondary)',
          border: `1px solid ${step1Done ? 'var(--green-border)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step1Done ? (
              <CheckCircle2 size={18} color="var(--green)" />
            ) : (
              <Circle size={18} color="var(--text-muted)" />
            )}
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: step1Done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: step1Done ? 'line-through' : 'none' }}>
                Step 1: Set your Cash or Bank balance
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add starting funds under Wallets &amp; Banks</div>
            </div>
          </div>

          {!step1Done && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/accounts?tab=self')}
              style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
            >
              Add Balance <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Step 2: First Expense */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: step2Done ? 'var(--green-bg)' : 'var(--bg-secondary)',
          border: `1px solid ${step2Done ? 'var(--green-border)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step2Done ? (
              <CheckCircle2 size={18} color="var(--green)" />
            ) : (
              <Circle size={18} color="var(--text-muted)" />
            )}
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: step2Done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: step2Done ? 'line-through' : 'none' }}>
                Step 2: Record your first expense
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Log a daily expense to start tracking spend trends</div>
            </div>
          </div>

          {!step2Done && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/expenses')}
              style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
            >
              Log Expense <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Step 3: Add Person / Receivable */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: step3Done ? 'var(--green-bg)' : 'var(--bg-secondary)',
          border: `1px solid ${step3Done ? 'var(--green-border)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step3Done ? (
              <CheckCircle2 size={18} color="var(--green)" />
            ) : (
              <Circle size={18} color="var(--text-muted)" />
            )}
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: step3Done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: step3Done ? 'line-through' : 'none' }}>
                Step 3: Add a person who owes you money (Optional)
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Keep track of Receivables and peer balances</div>
            </div>
          </div>

          {!step3Done && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/accounts?tab=receivable')}
              style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
            >
              Add Person <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
