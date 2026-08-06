import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { supabase } from '../lib/supabase'
import { logError, analytics } from '../lib/analytics'
import {
  Shield, ShieldCheck, ShieldAlert, Smartphone, Copy, Check,
  Trash2, AlertCircle, CheckCircle2, KeyRound, Mail, User, Clock, LogOut,
  HelpCircle, FileText, Lock, Send, MessageSquare, Crown, Zap, CreditCard, Download, Receipt, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react'
import { exportPaymentInvoicePDF } from '../lib/pdfExport'
import { SettingsSkeleton } from '../components/Skeletons'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import UpgradeModal from '../components/UpgradeModal'
import ReferralCard from '../components/ReferralCard'

export default function Settings() {
  const { user, enrollMFA, challengeAndVerifyMFA, unenrollMFA, getMFAFactors, signOut, updatePassword } = useAuth()

  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Password Management State
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passErr, setPassErr] = useState('')

  const identities = user?.identities || []
  const hasEmailIdentity = identities.some(i => i.provider === 'email') || user?.app_metadata?.providers?.includes('email')
  const hasGoogleIdentity = identities.some(i => i.provider === 'google') || user?.app_metadata?.providers?.includes('google')
  const isGoogleOnly = hasGoogleIdentity && !hasEmailIdentity

  const handleSetPassword = async (e) => {
    e.preventDefault()
    setPassErr('')
    setPassMsg('')

    if (!newPass || newPass.length < 6) {
      setPassErr('Password must be at least 6 characters long.')
      return
    }

    if (newPass !== confirmPass) {
      setPassErr('Passwords do not match.')
      return
    }

    setPassLoading(true)
    try {
      await updatePassword(newPass)
      setPassMsg(isGoogleOnly
        ? 'Password saved successfully! You can now log in using either Google or your email & password.'
        : 'Password updated successfully!'
      )
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      console.error('Failed to update password:', err)
      setPassErr(err.message || 'Failed to update password. Please try again.')
    } finally {
      setPassLoading(false)
    }
  }

  // Enrollment flow
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

  // Subscription & Upgrade modal
  const { plan, status, isPro, isTrial, trialDaysLeft, billingCycle: subBillingCycle, currentPeriodEnd, receipts } = useSubscription()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showInvoices, setShowInvoices] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showMfaSection, setShowMfaSection] = useState(false)
  const [showAccountInfo, setShowAccountInfo] = useState(false)

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
      
      // Generate and save backup codes
      const codes = generateBackupCodes()
      const rows = codes.map(code => ({ code, user_id: user.id, used: false }))
      
      // Delete any old codes
      await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)
      
      // Insert new codes
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

  // Auto-submit when 6 digits entered during enrollment
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

  const loginProvider = user?.app_metadata?.provider || 'email'
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown'

  if (loading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage settings and account security</p>
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

      {/* Subscription & Billing Section */}
      <div className="security-section">
        <div className="card">
          <div className="security-section-header">
            <div className="security-section-icon indigo" style={{ background: 'var(--indigo-bg)', color: 'var(--indigo)' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <div className="security-section-title">Subscription & Billing</div>
              <div className="security-section-desc">Manage your plan and billing preferences</div>
            </div>
          </div>

          {/* Plan Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px',
            background: isPro ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.45), rgba(253, 230, 138, 0.25))' : (isTrial ? 'linear-gradient(135deg, #eff6ff, #f5f3ff)' : 'var(--bg-secondary)'),
            border: `1px solid ${isPro ? '#fde68a' : (isTrial ? '#c7d2fe' : 'var(--border-primary)')}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: 16
          }}>
            <div
              className={isPro ? 'pro-icon-gold-shine' : ''}
              style={{
                width: 42, height: 42, borderRadius: 10,
                background: isPro ? 'linear-gradient(135deg, #f59e0b, #d97706)' : (isTrial ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isPro ? '0 2px 8px rgba(217, 119, 6, 0.25)' : 'none',
              }}
            >
              {isPro ? <Crown size={22} color="white" /> : (isTrial ? <Zap size={20} color="white" /> : <User size={20} color="#64748b" />)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {isPro && !isTrial ? 'Pro Plan' : isTrial ? 'Pro Trial' : 'Free Plan'}
                <span style={{
                  padding: '2px 8px', borderRadius: 4,
                  background: isPro ? '#fef3c7' : (isTrial ? '#e0e7ff' : '#f1f5f9'),
                  color: isPro ? '#b45309' : (isTrial ? '#4f46e5' : '#64748b'),
                  fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                  border: isPro ? '1px solid rgba(245, 158, 11, 0.35)' : 'none'
                }}>
                  {isPro && !isTrial ? 'Active' : isTrial ? `${trialDaysLeft} days left` : 'Current'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {isPro && !isTrial
                  ? (currentPeriodEnd
                      ? `${subBillingCycle === 'annual' ? 'Annual' : 'Monthly'} · Renews ${new Date(currentPeriodEnd).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`
                      : 'Unlimited accounts · Unlimited shared links · PDF Statements')
                  : isTrial
                  ? 'Enjoy full Pro features during your trial period'
                  : '10 accounts · 3 shared links · Fault reconciliation'
                }
              </div>
            </div>
            {!isPro && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowUpgradeModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                <Crown size={14} /> Upgrade to Pro
              </button>
            )}
          </div>

          {/* Quick Plan Features */}
          {!isPro && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.72rem', color: 'var(--text-secondary)',
              lineHeight: 1.7,
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>Unlock with Pro:</strong> Unlimited accounts, unlimited shared links, PDF reports, budget benchmarks &amp; priority support — starting at just ₹149/month.
            </div>
          )}
        </div>
      </div>

      {/* Invoices & Billing History Section (Default Collapsed) */}
      <div className="security-section">
        <div className="card" style={{ transition: 'all 0.2s' }}>
          <div
            className="security-section-header"
            onClick={() => setShowInvoices(!showInvoices)}
            style={{ cursor: 'pointer', userSelect: 'none', marginBottom: showInvoices ? 16 : 0, justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="security-section-icon indigo" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                <Receipt size={20} />
              </div>
              <div>
                <div className="security-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Invoices &amp; Payment Receipts</span>
                  {receipts && receipts.length > 0 && (
                    <span className="badge badge-amber" style={{ fontSize: '0.62rem', padding: '1px 8px' }}>
                      {receipts.length} Receipt{receipts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="security-section-desc">Download official PDF tax receipts for your Accountize subscription payments</div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem', borderRadius: 20 }}
              onClick={(e) => { e.stopPropagation(); setShowInvoices(!showInvoices); }}
            >
              {showInvoices ? <>Hide <ChevronUp size={14} /></> : <>View <ChevronDown size={14} /></>}
            </button>
          </div>

          {showInvoices && (
            <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
              {receipts && receipts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {receipts.map(rcpt => (
                    <div key={rcpt.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="pro-icon-gold-shine" style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Receipt size={18} color="white" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{rcpt.receipt_number}</span>
                            <span className="badge badge-green" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>PAID</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {rcpt.billing_cycle === 'annual' ? 'Annual Pro Plan' : 'Monthly Pro Plan'} · {new Date(rcpt.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          ₹{rcpt.amount}
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '6px 12px', fontWeight: 600 }}
                          onClick={() => exportPaymentInvoicePDF({ receipt: rcpt, user })}
                          title="Download PDF Tax Invoice"
                        >
                          <Download size={14} /> PDF Invoice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '24px 16px', background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-primary)',
                  fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                }}>
                  <Receipt size={24} style={{ opacity: 0.5, color: '#d97706' }} />
                  <div>No billing receipts found yet. Upgrading to Pro will automatically generate downloadable PDF tax invoices here.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password & Credentials Section (Default Collapsed) */}
      <div className="security-section">
        <div className="card" style={{ transition: 'all 0.2s' }}>
          <div
            className="security-section-header"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            style={{ cursor: 'pointer', userSelect: 'none', marginBottom: showPasswordSection ? 16 : 0, justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="security-section-icon indigo" style={{ background: 'var(--indigo-bg)', color: 'var(--indigo)' }}>
                <KeyRound size={20} />
              </div>
              <div>
                <div className="security-section-title">Password &amp; Account Credentials</div>
                <div className="security-section-desc">
                  {isGoogleOnly
                    ? 'Your account was created via Google OAuth. Set a password to enable direct email login.'
                    : 'Manage or update your account password for secure login'
                  }
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem', borderRadius: 20 }}
              onClick={(e) => { e.stopPropagation(); setShowPasswordSection(!showPasswordSection); }}
            >
              {showPasswordSection ? <>Hide <ChevronUp size={14} /></> : <>View <ChevronDown size={14} /></>}
            </button>
          </div>

          {showPasswordSection && (
            <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
              {passMsg && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#047857',
                  marginBottom: 16
                }}>
                  <CheckCircle2 size={16} />
                  <span>{passMsg}</span>
                </div>
              )}

              {passErr && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#dc2626',
                  marginBottom: 16
                }}>
                  <AlertCircle size={16} />
                  <span>{passErr}</span>
                </div>
              )}

              <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      {isGoogleOnly ? 'Create New Password' : 'New Password'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Enter password (min 6 chars)"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        style={{ paddingRight: 36, width: '100%' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                          padding: 2
                        }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Confirm Password
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Re-enter password"
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={12} /> Encrypted using Supabase Argon2 / bcrypt hashing
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={passLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <KeyRound size={14} />
                    {passLoading ? 'Saving...' : (isGoogleOnly ? 'Set Password & Enable Email Login' : 'Update Password')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Referral Section (Default Collapsed) */}
      <div className="security-section">
        <ReferralCard defaultCollapsed={true} />
      </div>

      {/* MFA Section (Default Collapsed) */}
      <div className="security-section">
        <div className="card" style={{ transition: 'all 0.2s' }}>
          <div
            className="security-section-header"
            onClick={() => setShowMfaSection(!showMfaSection)}
            style={{ cursor: 'pointer', userSelect: 'none', marginBottom: showMfaSection ? 16 : 0, justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="security-section-icon indigo">
                <Shield size={20} />
              </div>
              <div>
                <div className="security-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Two-Factor Authentication</span>
                  {hasMFA && (
                    <span className="badge badge-green" style={{ fontSize: '0.62rem', padding: '1px 8px' }}>
                      Active
                    </span>
                  )}
                </div>
                <div className="security-section-desc">Add an extra layer of security with a TOTP authenticator app</div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem', borderRadius: 20 }}
              onClick={(e) => { e.stopPropagation(); setShowMfaSection(!showMfaSection); }}
            >
              {showMfaSection ? <>Hide <ChevronUp size={14} /></> : <>View <ChevronDown size={14} /></>}
            </button>
          </div>

          {showMfaSection && (
            <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
              {loading ? (
                <div style={{ padding: '20px 0' }}>
                  <div className="skeleton" style={{ height: 60, width: '100%' }} />
                </div>
              ) : hasMFA ? (
                // MFA is active
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px',
                    background: 'var(--green-bg)',
                    border: '1px solid var(--green-border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 16
                  }}>
                    <ShieldCheck size={20} color="var(--green)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--green)' }}>
                        MFA is Active
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Your account is protected with two-factor authentication
                      </div>
                    </div>
                  </div>

                  {verifiedFactors.map(factor => (
                    <div key={factor.id} className="security-item">
                      <div className="security-item-info">
                        <div className="security-item-icon" style={{ background: 'var(--indigo-bg)', color: 'var(--indigo)' }}>
                          <Smartphone size={18} />
                        </div>
                        <div className="security-item-text">
                          <h4>{factor.friendly_name || 'Authenticator App'}</h4>
                          <p>Added {new Date(factor.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteConfirm({ id: factor.id, name: factor.friendly_name || 'Authenticator App' })}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                // MFA not set up
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px',
                    background: 'var(--amber-bg)',
                    border: '1px solid var(--amber-border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 16
                  }}>
                    <ShieldAlert size={20} color="var(--amber)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--amber)' }}>
                        MFA Not Enabled
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Enable MFA to protect your financial data with a second layer of security
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleStartEnroll}>
                    <Shield size={16} /> Enable Two-Factor Authentication
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Account Info Section (Default Collapsed) */}
      <div className="security-section">
        <div className="card" style={{ transition: 'all 0.2s' }}>
          <div
            className="security-section-header"
            onClick={() => setShowAccountInfo(!showAccountInfo)}
            style={{ cursor: 'pointer', userSelect: 'none', marginBottom: showAccountInfo ? 16 : 0, justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="security-section-icon blue">
                <User size={20} />
              </div>
              <div>
                <div className="security-section-title">Account Information</div>
                <div className="security-section-desc">Your sign-in details and session info</div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem', borderRadius: 20 }}
              onClick={(e) => { e.stopPropagation(); setShowAccountInfo(!showAccountInfo); }}
            >
              {showAccountInfo ? <>Hide <ChevronUp size={14} /></> : <>View <ChevronDown size={14} /></>}
            </button>
          </div>

          {showAccountInfo && (
            <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
              <div className="security-item">
                <div className="security-item-info">
                  <div className="security-item-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                    <Mail size={18} />
                  </div>
                  <div className="security-item-text">
                    <h4>Email</h4>
                    <p>{user?.email || 'Not available'}</p>
                  </div>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-info">
                  <div className="security-item-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
                    <KeyRound size={18} />
                  </div>
                  <div className="security-item-text">
                    <h4>Login Method</h4>
                    <p style={{ textTransform: 'capitalize' }}>{loginProvider}</p>
                  </div>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-info">
                  <div className="security-item-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                    <Clock size={18} />
                  </div>
                  <div className="security-item-text">
                    <h4>Last Sign In</h4>
                    <p>{lastSignIn}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Section */}
      <div className="security-section">
        <div className="card">
          <div className="security-section-header">
            <div className="security-section-icon red" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
              <LogOut size={20} />
            </div>
            <div>
              <div className="security-section-title">Sign Out</div>
              <div className="security-section-desc">Sign out of your Accountize session on this device</div>
            </div>
          </div>
          <button 
            className="btn btn-danger" 
            onClick={signOut}
            style={{ alignSelf: 'flex-start', marginTop: 12 }}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

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

      {/* Legal & Support Section */}
      <div className="security-section" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="security-section-header">
            <div className="security-section-icon blue" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <div className="security-section-title">Support &amp; Legal</div>
              <div className="security-section-desc">Get assistance or view legal policies and terms</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSupportModal(true)}
            >
              <MessageSquare size={16} /> Contact Support
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowPrivacyModal(true)}
            >
              <Lock size={16} /> Privacy Policy
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowTermsModal(true)}
            >
              <FileText size={16} /> Terms of Service
            </button>
          </div>
        </div>
      </div>

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

      {/* Confirm Remove MFA */}
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
