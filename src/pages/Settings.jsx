import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { supabase } from '../lib/supabase'
import { logError, analytics } from '../lib/analytics'
import {
  User, Shield, CreditCard, RefreshCw, CheckCircle2, AlertCircle, Check, Copy,
  MessageSquare, Send, Lock, FileText, ShieldCheck
} from 'lucide-react'
import { SettingsSkeleton } from '../components/Skeletons'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import UpgradeModal from '../components/UpgradeModal'

import AccountTab from '../components/settings/AccountTab'
import SecurityTab from '../components/settings/SecurityTab'
import BillingTab from '../components/settings/BillingTab'
import SystemTab from '../components/settings/SystemTab'

const TABS = [
  { id: 'account', label: 'Profile & Account', icon: User },
  { id: 'security', label: 'Security & Auth', icon: Shield },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'system', label: 'System & Support', icon: RefreshCw },
]

export default function Settings() {
  const { user, enrollMFA, challengeAndVerifyMFA, unenrollMFA, getMFAFactors, signOut, updatePassword } = useAuth()
  const subscription = useSubscription()

  // Tab State
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    return TABS.some(t => t.id === hash) ? hash : 'account'
  })

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    window.history.replaceState(null, '', `#${tabId}`)
  }

  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Hard Refresh State
  const [hardRefreshing, setHardRefreshing] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)

  const handleHardRefresh = async () => {
    setHardRefreshing(true)
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys()
        await Promise.all(cacheKeys.map(key => caches.delete(key)))
      }
      sessionStorage.clear()
      setRefreshSuccess(true)
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname + '?reload=' + Date.now()
      }, 500)
    } catch (err) {
      console.error('Hard refresh error:', err)
      window.location.reload(true)
    }
  }

  // Enrollment flow state
  const [enrolling, setEnrolling] = useState(false)
  const [enrollData, setEnrollData] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [copied, setCopied] = useState(false)

  // Backup codes state
  const [backupCodes, setBackupCodes] = useState([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  // Unenroll confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Legal & Support modals state
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [supportSubject, setSupportSubject] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportSent, setSupportSent] = useState(false)

  // Upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    loadFactors()
  }, [])

  async function loadFactors() {
    try {
      setLoading(true)
      const data = await getMFAFactors()
      setFactors(data?.totp || [])
    } catch (err) {
      console.error('Failed to load MFA factors:', err)
    } finally {
      setLoading(false)
    }
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified')
  const hasMFA = verifiedFactors.length > 0

  const handleStartEnroll = async () => {
    setError('')
    setSuccess('')
    setEnrolling(true)
    try {
      const data = await enrollMFA()
      setEnrollData(data)
    } catch (err) {
      console.error('Enrollment error:', err)
      setError(err.message || 'Failed to start MFA enrollment.')
      setEnrolling(false)
    }
  }

  const generateBackupCodes = () => {
    const codes = []
    for (let i = 0; i < 8; i++) {
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase()
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase()
      codes.push(`${part1}-${part2}`)
    }
    return codes
  }

  const handleCopyBackupCodes = () => {
    const text = backupCodes.join('\n')
    navigator.clipboard.writeText(text)
    setCopiedCodes(true)
    setTimeout(() => setCopiedCodes(false), 2000)
  }

  const handleDownloadBackupCodes = () => {
    const text = `ACCOUNTIZE MFA RECOVERY CODES\n\nSave these codes in a secure place. Each code can only be used once.\n\n${backupCodes.join('\n')}\n\nGenerated on: ${new Date().toLocaleString()}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accountize-mfa-recovery-codes.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFinishEnroll = () => {
    setSuccess('MFA has been successfully enabled! Your account is now protected with two-factor authentication.')
    setEnrolling(false)
    setEnrollData(null)
    setShowBackupCodes(false)
    setBackupCodes([])
  }

  const handleVerifyEnrollment = async (e) => {
    e.preventDefault()
    setVerifyError('')

    if (verifyCode.length !== 6) {
      setVerifyError('Please enter a 6-digit code.')
      return
    }

    setVerifyLoading(true)
    try {
      await challengeAndVerifyMFA(enrollData.id, verifyCode)
      const codes = generateBackupCodes()
      const rows = codes.map(code => ({ code, user_id: user.id, used: false }))
      await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)
      const { error: dbError } = await supabase.from('mfa_backup_codes').insert(rows)
      if (dbError) throw dbError

      setBackupCodes(codes)
      setShowBackupCodes(true)
      setVerifyCode('')
      analytics.mfaEnabled()
      await loadFactors()
    } catch (err) {
      console.error('Verify error:', err)
      setVerifyError(err.message || 'Invalid code. Please check your authenticator app and try again.')
      setVerifyCode('')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleCancelEnroll = async () => {
    const factorId = enrollData?.id
    setEnrolling(false)
    setEnrollData(null)
    setVerifyCode('')
    setVerifyError('')
    setShowBackupCodes(false)
    setBackupCodes([])

    if (factorId) {
      try {
        await unenrollMFA(factorId)
      } catch (err) {
        console.error('Failed to clean up unverified factor on cancel:', err)
      }
    }
  }

  const handleUnenroll = async (factorId) => {
    setError('')
    setSuccess('')
    try {
      await unenrollMFA(factorId)
      setSuccess('MFA has been disabled successfully.')
      await loadFactors()
    } catch (err) {
      console.error('Unenroll error:', err)
      setError(err.message || 'Failed to disable MFA.')
    }
  }

  const handleCopySecret = () => {
    if (enrollData?.totp?.secret) {
      navigator.clipboard.writeText(enrollData.totp.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    if (verifyCode.length === 6 && enrollData && !verifyLoading) {
      handleVerifyEnrollment({ preventDefault: () => {} })
    }
  }, [verifyCode])

  const handleSendSupport = async (e) => {
    e.preventDefault()
    if (!supportSubject.trim() || !supportMessage.trim()) return
    setSupportLoading(true)
    try {
      await logError(`[Support Ticket] ${supportSubject}`, supportMessage, window.location.href)
      analytics.supportTicketSubmitted(supportSubject)
      setSupportSent(true)
      setTimeout(() => {
        setShowSupportModal(false)
        setSupportSent(false)
        setSupportSubject('')
        setSupportMessage('')
      }, 2000)
    } catch (err) {
      console.error('Failed to submit support ticket:', err)
    } finally {
      setSupportLoading(false)
    }
  }

  if (loading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your account, security, subscription, and preferences</p>
        </div>
      </div>

      {error && (
        <div className="auth-alert error" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="auth-alert success" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Tab Navigation Pill Bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-primary)',
        paddingBottom: 12,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                fontWeight: isActive ? 700 : 500,
                border: isActive ? '1px solid transparent' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                background: isActive ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === 'account' && (
        <AccountTab
          user={user}
          signOut={signOut}
        />
      )}

      {activeTab === 'security' && (
        <SecurityTab
          user={user}
          updatePassword={updatePassword}
          loading={loading}
          hasMFA={hasMFA}
          verifiedFactors={verifiedFactors}
          handleStartEnroll={handleStartEnroll}
          setDeleteConfirm={setDeleteConfirm}
        />
      )}

      {activeTab === 'billing' && (
        <BillingTab
          subscription={subscription}
          setShowUpgradeModal={setShowUpgradeModal}
          user={user}
        />
      )}

      {activeTab === 'system' && (
        <SystemTab
          handleHardRefresh={handleHardRefresh}
          hardRefreshing={hardRefreshing}
          refreshSuccess={refreshSuccess}
          setShowSupportModal={setShowSupportModal}
          setShowPrivacyModal={setShowPrivacyModal}
          setShowTermsModal={setShowTermsModal}
        />
      )}

      {/* MFA Enrollment Modal */}
      {enrolling && enrollData && (
        <Modal 
          title={showBackupCodes ? "MFA Recovery Codes" : "Set Up Two-Factor Authentication"} 
          onClose={showBackupCodes ? undefined : handleCancelEnroll}
        >
          {showBackupCodes ? (
            <div className="mfa-setup-card">
              <p className="mfa-step-instruction" style={{ marginBottom: 16 }}>
                Please save these backup recovery codes in a secure location (such as a password manager). 
                If you lose access to your authenticator app, these codes are the <strong>only way</strong> to regain access to your account.
              </p>

              <div className="mfa-backup-codes-grid">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="mfa-backup-code-item">
                    {code}
                  </div>
                ))}
              </div>

              <div className="mfa-backup-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyBackupCodes}>
                  {copiedCodes ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Codes</>}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadBackupCodes}>
                  Download as TXT
                </button>
              </div>

              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 24 }}
                onClick={handleFinishEnroll}
              >
                I have saved these codes
              </button>
            </div>
          ) : (
            <div className="mfa-setup-card">
              {/* Step 1: Scan QR */}
              <div className="mfa-step-label">Step 1</div>
              <p className="mfa-step-instruction">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>

              <div className="mfa-qr-container">
                {enrollData.totp.qr_code.startsWith('data:') ? (
                  <img src={enrollData.totp.qr_code} alt="MFA QR Code" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }} />
                )}
              </div>

              {/* Secret key fallback */}
              <div className="mfa-step-label" style={{ marginTop: 4 }}>Can't scan? Enter this key manually</div>
              <div className="mfa-secret-key">
                <span>{enrollData.totp.secret}</span>
                <button onClick={handleCopySecret} title="Copy secret key">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              {/* Step 2: Verify */}
              <div className="mfa-step-label" style={{ marginTop: 8 }}>Step 2</div>
              <p className="mfa-step-instruction">
                Enter the 6-digit code from your authenticator app to verify setup
              </p>

              {verifyError && (
                <div className="auth-alert error" style={{ width: '100%', margin: 0 }}>
                  <AlertCircle size={16} />
                  <span>{verifyError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyEnrollment} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <input
                  type="text"
                  className="mfa-code-input"
                  value={verifyCode}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setVerifyCode(val)
                  }}
                  placeholder="000000"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />

                <div className="modal-actions" style={{ width: '100%', marginTop: 0 }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCancelEnroll}>Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={verifyLoading || verifyCode.length !== 6}
                  >
                    {verifyLoading ? (
                      <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      <><ShieldCheck size={14} /> Verify &amp; Enable</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      )}

      {/* Contact Support Modal */}
      {showSupportModal && (
        <Modal
          title="Contact Support"
          onClose={() => setShowSupportModal(false)}
        >
          {supportSent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle2 size={48} color="var(--green)" style={{ margin: '0 auto 16px' }} />
              <h3>Message Sent!</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                Our support team has received your ticket and will investigate shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendSupport} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Question about Shared Ledgers"
                  value={supportSubject}
                  onChange={e => setSupportSubject(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message / Details</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Describe your issue or question..."
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSupportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={supportLoading || !supportSubject.trim() || !supportMessage.trim()}
                >
                  {supportLoading ? (
                    <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                  ) : (
                    <><Send size={14} /> Send Message</>
                  )}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <Modal
          title="Privacy Policy"
          onClose={() => setShowPrivacyModal(false)}
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.875rem', lineHeight: '1.6' }}>
            <p><strong>Effective Date:</strong> August 2026</p>
            <p>At <strong>Accountize</strong> (by iNexarum), we prioritize your financial data privacy above all else.</p>

            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>1. Zero 3rd-Party Tracking</h4>
            <p>We do not use Google Analytics, Facebook Pixels, or any 3rd-party ad trackers. All event logging is handled strictly in-house via secure database instances.</p>

            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>2. Data Isolation & Security</h4>
            <p>Your transactions, account balances, and personal information are strictly isolated using Supabase Row-Level Security (RLS). Only your authenticated session (`auth.uid()`) can decrypt and access your records.</p>

            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>3. Data Rights</h4>
            <p>You retain 100% ownership of your data. You can export your financial statements or delete your account data at any time.</p>
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => setShowPrivacyModal(false)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <Modal
          title="Terms of Service"
          onClose={() => setShowTermsModal(false)}
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.875rem', lineHeight: '1.6' }}>
            <p><strong>Effective Date:</strong> August 2026</p>
            <p>Welcome to <strong>Accountize</strong>. By using our services, you agree to these terms.</p>

            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>1. Service Usage</h4>
            <p>Accountize provides double-entry financial tracking, shared ledgers, and PWA accounting toolsets for personal and small business use.</p>

            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>2. Account Security</h4>
            <p>You are responsible for maintaining the confidentiality of your account credentials and TOTP two-factor authentication tokens.</p>

            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>3. Collaborative Ledgers</h4>
            <p>When generating a Shared Ledger link, you explicitly grant the recipient permission to view and verify shared ledger line-items.</p>
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => setShowTermsModal(false)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Confirm Remove MFA Modal */}
      {deleteConfirm && (
        <ConfirmModal
          title="Disable Two-Factor Authentication?"
          message={`Are you sure you want to remove "${deleteConfirm.name}"? Your account will no longer be protected by two-factor authentication.`}
          confirmText="Disable MFA"
          onConfirm={() => handleUnenroll(deleteConfirm.id)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  )
}
