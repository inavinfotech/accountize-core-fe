import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Shield, ShieldCheck, ShieldAlert, Smartphone, Copy, Check,
  Trash2, AlertCircle, CheckCircle2, KeyRound, Mail, User, Clock, LogOut
} from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

export default function Settings() {
  const { user, enrollMFA, challengeAndVerifyMFA, unenrollMFA, getMFAFactors, signOut } = useAuth()

  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    const text = `ACCOUNTIFY MFA RECOVERY CODES\n\nSave these codes in a secure place. Each code can only be used once.\n\n${backupCodes.join('\n')}\n\nGenerated on: ${new Date().toLocaleString()}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accountify-mfa-recovery-codes.txt`
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
      await loadFactors()
    } catch (err) {
      console.error('Verify error:', err)
      setVerifyError(err.message || 'Invalid code. Please check your authenticator app and try again.')
      setVerifyCode('')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleCancelEnroll = () => {
    setEnrolling(false)
    setEnrollData(null)
    setVerifyCode('')
    setVerifyError('')
    setShowBackupCodes(false)
    setBackupCodes([])
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

  const loginProvider = user?.app_metadata?.provider || 'email'
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown'

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

      {/* MFA Section */}
      <div className="security-section">
        <div className="card">
          <div className="security-section-header">
            <div className="security-section-icon indigo">
              <Shield size={20} />
            </div>
            <div>
              <div className="security-section-title">Two-Factor Authentication</div>
              <div className="security-section-desc">Add an extra layer of security with a TOTP authenticator app</div>
            </div>
          </div>

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
      </div>

      {/* Account Info Section */}
      <div className="security-section">
        <div className="card">
          <div className="security-section-header">
            <div className="security-section-icon blue">
              <User size={20} />
            </div>
            <div>
              <div className="security-section-title">Account Information</div>
              <div className="security-section-desc">Your sign-in details and session info</div>
            </div>
          </div>

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
              <div className="security-section-desc">Sign out of your Accountify session on this device</div>
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

              <div className="mfa-qr-container" dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }} />

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
    </div>
  )
}
