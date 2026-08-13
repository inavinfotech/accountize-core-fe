import { useState } from 'react'
import {
  Shield, ShieldCheck, ShieldAlert, Smartphone, Trash2, KeyRound,
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle
} from 'lucide-react'

export default function SecurityTab({
  user,
  updatePassword,
  loading,
  hasMFA,
  verifiedFactors,
  handleStartEnroll,
  setDeleteConfirm,
}) {
  // Password state
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

  return (
    <div className="settings-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Two-Factor Authentication (MFA) Section */}
      <div className="card">
        <div className="security-section-header">
          <div className="security-section-icon indigo">
            <Shield size={20} />
          </div>
          <div>
            <div className="security-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Two-Factor Authentication (2FA)</span>
              {hasMFA && (
                <span className="badge badge-green" style={{ fontSize: '0.62rem', padding: '1px 8px' }}>
                  Active
                </span>
              )}
            </div>
            <div className="security-section-desc">Add an extra layer of security to your account with a TOTP authenticator app</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div style={{ padding: '16px 0' }}>
              <div className="skeleton" style={{ height: 60, width: '100%' }} />
            </div>
          ) : hasMFA ? (
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
                    2FA Protection Enabled
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Your account requires a code from your authenticator app on login
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
                    2FA Not Enabled
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Protect your financial data with an extra verification step during sign in
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

      {/* Password Management Section */}
      <div className="card">
        <div className="security-section-header">
          <div className="security-section-icon indigo" style={{ background: 'var(--indigo-bg)', color: 'var(--indigo)' }}>
            <KeyRound size={20} />
          </div>
          <div>
            <div className="security-section-title">Password & Credentials</div>
            <div className="security-section-desc">
              {isGoogleOnly
                ? 'Your account was created via Google OAuth. Set a password to enable direct email login.'
                : 'Manage or update your password for secure account access'
              }
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
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
                  {isGoogleOnly ? 'Create Password' : 'New Password'}
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
                <Lock size={12} /> Encrypted using Argon2 / bcrypt hashing
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
      </div>
    </div>
  )
}
