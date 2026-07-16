import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2,
  Shield, Wand2, KeyRound
} from 'lucide-react'

// Inline SVG icons for Google & GitHub (avoids extra dependencies)
function GoogleIcon() {
  return (
    <svg className="auth-social-icon" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="auth-social-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}

export default function Login() {
  const { signIn, signUp, signInWithOAuth, signInWithMagicLink, challengeAndVerifyMFA, getMFAFactors, isMfaRequired, signOut } = useAuth()
  const navigate = useNavigate()

  const searchParams = new URLSearchParams(window.location.search)
  const redirectUrl = searchParams.get('redirect') || '/'

  const [isSignUp, setIsSignUp] = useState(false)
  const [authMethod, setAuthMethod] = useState('password') // 'password' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaError, setMfaError] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')

  const handleToggleMode = () => {
    setIsSignUp(prev => !prev)
    setError('')
    setSuccessMsg('')
    setPassword('')
    setConfirmPassword('')
    setAuthMethod('password')
  }

  const handleSocialLogin = async (provider) => {
    setSocialLoading(provider)
    setError('')
    try {
      const redirectOption = redirectUrl !== '/' ? { redirectTo: `${window.location.origin}${redirectUrl}` } : {}
      await signInWithOAuth(provider, redirectOption)
    } catch (err) {
      console.error(err)
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1)
      if (err.message?.includes('400') || err.status === 400 || err.message?.toLowerCase().includes('unsupported')) {
        setError(`${providerName} login is not configured yet. Please enable the ${providerName} provider in your Supabase Dashboard → Authentication → Providers.`)
      } else {
        setError(err.message || `Failed to sign in with ${providerName}.`)
      }
    } finally {
      setSocialLoading(null)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!email) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const redirectOption = redirectUrl !== '/' ? { emailRedirectTo: `${window.location.origin}${redirectUrl}` } : {}
      await signInWithMagicLink(email, redirectOption)
      setSuccessMsg('Magic link sent! Check your email inbox and click the link to sign in.')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to send magic link.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
        setSuccessMsg('Registration successful! Please check your email for a confirmation link (if enabled) or try logging in.')
        // Clear password fields
        setPassword('')
        setConfirmPassword('')
      } else {
        await signIn(email, password)
        
        // Check if MFA is required
        try {
          const factors = await getMFAFactors()
          const verifiedFactors = factors?.totp?.filter(f => f.status === 'verified') || []
          
          if (verifiedFactors.length > 0) {
            setMfaRequired(true)
            setMfaFactorId(verifiedFactors[0].id)
            setLoading(false)
            return
          }
        } catch {
          // MFA not available or no factors — proceed normally
        }
        
        navigate(redirectUrl, { replace: true })
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  const handleMFAVerify = async (e) => {
    e.preventDefault()
    setMfaError('')

    if (mfaCode.length !== 6) {
      setMfaError('Please enter a 6-digit code.')
      return
    }

    setMfaLoading(true)
    try {
      await challengeAndVerifyMFA(mfaFactorId, mfaCode)
      navigate(redirectUrl, { replace: true })
    } catch (err) {
      console.error(err)
      setMfaError(err.message || 'Invalid verification code. Please try again.')
      setMfaCode('')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleBackupCodeVerify = async (e) => {
    e.preventDefault()
    setMfaError('')

    if (!backupCode.trim()) {
      setMfaError('Please enter a recovery code.')
      return
    }

    setMfaLoading(true)
    try {
      const { data: isSuccess, error: rpcError } = await supabase.rpc('bypass_mfa_with_backup_code', {
        plain_code: backupCode.trim().toUpperCase()
      })

      if (rpcError) throw rpcError

      if (isSuccess) {
        setMfaRequired(false)
        setBackupCode('')
        setUseBackupCode(false)
        navigate(redirectUrl, { replace: true })
      } else {
        setMfaError('Invalid or already used recovery code.')
      }
    } catch (err) {
      console.error(err)
      setMfaError(err.message || 'Failed to verify recovery code.')
    } finally {
      setMfaLoading(false)
    }
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (mfaCode.length === 6 && mfaRequired && !mfaLoading) {
      handleMFAVerify({ preventDefault: () => {} })
    }
  }, [mfaCode])

  // Handle MFA step up check on mount or when auth state updates it
  useEffect(() => {
    if (isMfaRequired) {
      async function setupMfaPrompt() {
        try {
          const factors = await getMFAFactors()
          const verifiedFactors = factors?.totp?.filter(f => f.status === 'verified') || []
          if (verifiedFactors.length > 0) {
            setMfaRequired(true)
            setMfaFactorId(verifiedFactors[0].id)
          }
        } catch (err) {
          console.error('Failed to load MFA factors on mount/update:', err)
        }
      }
      setupMfaPrompt()
    } else {
      setMfaRequired(false)
      setMfaFactorId(null)
    }
  }, [isMfaRequired])


  return (
    <div className="auth-container">
      <div className="auth-promo-side">
        <div className="auth-promo-body">
          <h2 className="auth-promo-title">
            Take control of your money, <span>effortlessly</span>.
          </h2>
          <p className="auth-promo-text">
            Track your expenses, manage your accounts, and visualize your financial health in one beautifully designed, secure platform.
          </p>

          <div className="auth-mockup-container">
            <div className="auth-mockup-window">
              <div className="auth-mockup-titlebar">
                <div className="window-dots">
                  <span className="window-dot dot-close"></span>
                  <span className="window-dot dot-min"></span>
                  <span className="window-dot dot-expand"></span>
                </div>
                <div className="window-address">app.accountify.com/dashboard</div>
              </div>
              <div className="auth-mockup-layout">
                <div className="auth-mockup-sidebar">
                  <div className="mockup-sidebar-item active"></div>
                  <div className="mockup-sidebar-item"></div>
                  <div className="mockup-sidebar-item"></div>
                  <div className="mockup-sidebar-item"></div>
                </div>
                <div className="auth-mockup-main">
                  <div className="mockup-grid">
                    <div className="mockup-widget">
                      <span className="mockup-label">Net Balance</span>
                      <span className="mockup-val">₹14,240.50</span>
                      <span className="mockup-sub green">↑ +8.2% this week</span>
                    </div>
                    <div className="mockup-widget">
                      <span className="mockup-label">Cash Flow</span>
                      <div className="mockup-chart-bars">
                        <div className="mockup-chart-bar" style={{ height: '35%' }}></div>
                        <div className="mockup-chart-bar" style={{ height: '60%' }}></div>
                        <div className="mockup-chart-bar" style={{ height: '45%' }}></div>
                        <div className="mockup-chart-bar" style={{ height: '80%' }}></div>
                        <div className="mockup-chart-bar" style={{ height: '55%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="mockup-activities">
                    <span className="mockup-label">Recent Transactions</span>
                    <div className="mockup-activity">
                      <div className="activity-icon green">+₹</div>
                      <div className="activity-details">
                        <span className="activity-name">Payroll Deposit</span>
                        <span className="activity-date">Today, 9:00 AM</span>
                      </div>
                      <span className="activity-amount green">+₹3,500.00</span>
                    </div>
                    <div className="mockup-activity">
                      <div className="activity-icon red">-₹</div>
                      <div className="activity-details">
                        <span className="activity-name">Supermarket</span>
                        <span className="activity-date">Yesterday, 4:32 PM</span>
                      </div>
                      <span className="activity-amount">-₹124.50</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mockup-glow"></div>
          </div>
        </div>

        <div className="promo-glow glow-1"></div>
        <div className="promo-glow glow-2"></div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-header-logo">
            <img src="/logo.svg" alt="Accountify Logo" className="auth-logo-icon" />
            <h1>Accountify</h1>
            <p>Personal Finance Management</p>
          </div>

          <h2 className="auth-title">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>

          {/* Social Login Buttons (sign-in only) */}
          {!isSignUp && (
            <>
              <div className="auth-social-buttons">
                <button
                  type="button"
                  className="auth-social-btn google"
                  onClick={() => handleSocialLogin('google')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'google' ? (
                    <span className="auth-spinner" style={{ borderTopColor: '#EA4335', borderColor: '#e5e7eb' }}></span>
                  ) : (
                    <GoogleIcon />
                  )}
                  Continue with Google
                </button>
              </div>

              <div className="auth-divider">
                <span>or continue with email</span>
              </div>

              {/* Auth Method Tabs */}
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab ${authMethod === 'password' ? 'active' : ''}`}
                  onClick={() => { setAuthMethod('password'); setError(''); setSuccessMsg('') }}
                >
                  <KeyRound size={14} /> Password
                </button>
                <button
                  type="button"
                  className={`auth-tab ${authMethod === 'magic' ? 'active' : ''}`}
                  onClick={() => { setAuthMethod('magic'); setError(''); setSuccessMsg('') }}
                >
                  <Wand2 size={14} /> Magic Link
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Magic Link Form */}
          {authMethod === 'magic' && !isSignUp ? (
            <form className="auth-form" onSubmit={handleMagicLink}>
              <div className="auth-form-group">
                <label className="auth-label" htmlFor="magic-email">Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="magic-email"
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner"></span>
                ) : (
                  <>
                    <Wand2 size={16} /> Send Magic Link
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Email / Password Form */
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label className="auth-label" htmlFor="email">Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="email"
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label className="auth-label" htmlFor="password">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="auth-form-group">
                  <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner"></span>
                ) : (
                  isSignUp ? 'Sign Up' : 'Sign In'
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" className="auth-link-btn" onClick={handleToggleMode}>
                {isSignUp ? 'Sign In' : 'Register Here'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {mfaRequired && (
        <div className="mfa-overlay animate-fade-in">
          <div className="mfa-modal-card animate-scale-up">
            <div className="mfa-verify-container">
              <div className="mfa-verify-icon">
                <Shield size={28} />
              </div>
              <h2 className="mfa-verify-title">
                {useBackupCode ? 'MFA Recovery' : 'Two-Factor Authentication'}
              </h2>
              <p className="mfa-verify-subtitle">
                {useBackupCode 
                  ? 'Enter one of your 8-character recovery codes (e.g. XXXX-XXXX) to sign in and disable MFA.'
                  : 'Enter the 6-digit code from your authenticator app'}
              </p>

              {mfaError && (
                <div className="auth-alert error" style={{ width: '100%' }}>
                  <AlertCircle size={16} />
                  <span>{mfaError}</span>
                </div>
              )}

              {useBackupCode ? (
                <form onSubmit={handleBackupCodeVerify} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <input
                    type="text"
                    className="mfa-code-input"
                    value={backupCode}
                    onChange={e => {
                      let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
                      if (val.length > 4) {
                        val = val.slice(0, 4) + '-' + val.slice(4)
                      }
                      setBackupCode(val)
                    }}
                    placeholder="XXXX-XXXX"
                    autoFocus
                    style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
                  />

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={mfaLoading || backupCode.length !== 9}
                    style={{ maxWidth: 240 }}
                  >
                    {mfaLoading ? <span className="auth-spinner"></span> : 'Verify Code'}
                  </button>

                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setUseBackupCode(false)
                      setMfaError('')
                      setBackupCode('')
                    }}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Use Authenticator App Instead
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMFAVerify} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <input
                    type="text"
                    className="mfa-code-input"
                    value={mfaCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setMfaCode(val)
                    }}
                    placeholder="000000"
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={mfaLoading || mfaCode.length !== 6}
                    style={{ maxWidth: 240 }}
                  >
                    {mfaLoading ? <span className="auth-spinner"></span> : 'Verify'}
                  </button>

                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setUseBackupCode(true)
                      setMfaError('')
                      setMfaCode('')
                    }}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Lost your device? Use recovery code
                  </button>
                </form>
              )}

              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  signOut().catch(console.error)
                  setMfaRequired(false)
                  setMfaCode('')
                  setBackupCode('')
                  setUseBackupCode(false)
                  setMfaError('')
                  setMfaFactorId(null)
                }}
                style={{ marginTop: 12 }}
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
