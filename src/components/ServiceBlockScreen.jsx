import React, { useEffect } from 'react'
import { Ban, ShieldAlert, LogOut, Mail, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Premium Service Block Screen Component
 * Rendered when a service (Login, Signup, or User Panel) is deactivated by super admin.
 * If custom HTML is provided, it renders ONLY the HTML taking up full screen (no default card/popup).
 */
export default function ServiceBlockScreen({
  title = 'Service Temporarily Unavailable',
  message = '',
  icon: Icon = Ban,
  allowSignOut = false,
  onBackToLogin = null
}) {
  const { signOut } = useAuth()

  // Detect if message contains HTML markup
  const isHtml = message && /<[a-z][\s\S]*>/i.test(message)

  // Strip inline <script> tags for security
  const safeMessage = message ? message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : ''

  // Full-Screen HTML mode (No default popup card)
  if (isHtml) {
    return (
      <div className="service-block-fullscreen-html">
        {/* Subtle floating controls bar for sign out / navigation */}
        {(allowSignOut || onBackToLogin) && (
          <div className="service-block-floating-bar">
            {onBackToLogin && (
              <button className="btn btn-secondary btn-sm" onClick={onBackToLogin} style={{ borderRadius: '9999px', fontSize: '0.78rem' }}>
                <ArrowLeft size={13} /> Back to Sign In
              </button>
            )}
            {allowSignOut && (
              <button className="btn btn-secondary btn-sm" onClick={() => signOut()} style={{ borderRadius: '9999px', fontSize: '0.78rem' }}>
                <LogOut size={13} /> Sign Out
              </button>
            )}
          </div>
        )}

        {/* Direct Full-Screen HTML Output */}
        <div
          className="service-block-raw-html"
          dangerouslySetInnerHTML={{ __html: safeMessage }}
        />
      </div>
    )
  }

  // Fallback default card popup mode if plain text or no message is provided
  return (
    <div className="service-block-screen">
      <div className="service-block-card">
        {/* Animated Warning / Block Icon */}
        <div className="service-block-icon-wrapper">
          <div className="service-block-icon-halo" />
          <div className="service-block-icon-badge">
            <Icon size={32} />
          </div>
        </div>

        {/* Title & Badge */}
        <div style={{ marginBottom: 12 }}>
          <span className="badge" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontSize: '0.72rem', padding: '4px 10px', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ShieldAlert size={12} /> System Maintenance Notice
          </span>
        </div>

        <h2 className="service-block-title">{title}</h2>

        {/* Custom Admin Block Plain Text */}
        <div className="service-block-message-box">
          <p className="service-block-message">
            {message || 'This service is currently deactivated by system administrators. Please check back later.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="service-block-actions">
          {allowSignOut && (
            <button className="btn btn-secondary" onClick={() => signOut()} style={{ borderRadius: '9999px', fontSize: '0.85rem' }}>
              <LogOut size={16} /> Sign Out
            </button>
          )}

          {onBackToLogin && (
            <button className="btn btn-secondary" onClick={onBackToLogin} style={{ borderRadius: '9999px', fontSize: '0.85rem' }}>
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          )}

          <a
            href="mailto:support@accountize.in"
            className="btn btn-primary"
            style={{ textDecoration: 'none', borderRadius: '9999px', fontSize: '0.85rem' }}
          >
            <Mail size={16} /> Contact Support
          </a>
        </div>

        {/* Footer Note */}
        <p style={{ marginTop: 24, fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
          Accountize Platform Governance & System Control
        </p>
      </div>
    </div>
  )
}
