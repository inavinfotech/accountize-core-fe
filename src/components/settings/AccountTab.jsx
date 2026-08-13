import { Mail, KeyRound, Clock, LogOut, User } from 'lucide-react'
import ReferralCard from '../ReferralCard'

export default function AccountTab({ user, signOut }) {
  const loginProvider = user?.app_metadata?.provider || 'email'
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown'

  return (
    <div className="settings-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Account Info Section */}
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

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="security-item">
            <div className="security-item-info">
              <div className="security-item-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                <Mail size={18} />
              </div>
              <div className="security-item-text">
                <h4>Email Address</h4>
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

      {/* Referral Section */}
      <div>
        <ReferralCard defaultCollapsed={false} />
      </div>

      {/* Logout Section */}
      <div className="card" style={{ border: '1px solid var(--red-border, rgba(239, 68, 68, 0.2))' }}>
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
          style={{ alignSelf: 'flex-start', marginTop: 16 }}
        >
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  )
}
