import { useState } from 'react'
import { RefreshCw, CheckCircle2, HelpCircle, MessageSquare, Lock, FileText, Smartphone, Download, Share, Compass, Check } from 'lucide-react'
import { usePWAInstall } from '../../hooks/usePWAInstall'

export default function SystemTab({
  handleHardRefresh,
  hardRefreshing,
  refreshSuccess,
  setShowSupportModal,
  setShowPrivacyModal,
  setShowTermsModal,
}) {
  const { canInstall, isStandalone, isIOS, installed, triggerInstall } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [installing, setInstalling] = useState(false)

  const handleInstallClick = async () => {
    if (canInstall) {
      setInstalling(true)
      try {
        await triggerInstall()
      } finally {
        setInstalling(false)
      }
    } else if (isIOS) {
      setShowIOSModal(true)
    }
  }

  return (
    <div className="settings-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* PWA Application & Desktop Integration Card */}
      <div className="card">
        <div className="security-section-header">
          <div className="security-section-icon indigo" style={{ background: 'var(--indigo-bg)', color: 'var(--indigo)' }}>
            <Smartphone size={20} />
          </div>
          <div>
            <div className="security-section-title">PWA Application &amp; Offline Access</div>
            <div className="security-section-desc">Install Accountize as a standalone application on mobile or desktop</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: '1 1 240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isStandalone || installed ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.75rem' }}>
                    <Check size={14} /> Standalone App Active
                  </span>
                </>
              ) : canInstall ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontSize: '0.75rem' }}>
                    <Download size={14} /> Ready to Install
                  </span>
                </>
              ) : (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    <Compass size={14} /> Running in Browser Mode
                  </span>
                </>
              )}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {isStandalone || installed
                ? 'Accountize is running as a dedicated standalone app with fast launch and offline caching.'
                : 'Install Accountize on your home screen or desktop taskbar for launch speed and offline access.'}
            </p>
          </div>

          <div>
            {isStandalone || installed ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled
                style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}
              >
                <CheckCircle2 size={14} color="#10b981" /> Installed
              </button>
            ) : canInstall ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleInstallClick}
                disabled={installing}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <Download size={14} /> {installing ? 'Prompting...' : 'Install App'}
              </button>
            ) : isIOS ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowIOSModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <Share size={14} /> iOS Install Instructions
              </button>
            ) : (
              <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Use browser menu to "Add to Home Screen"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* App Updates & Cache Section */}
      <div className="card">
        <div className="security-section-header">
          <div className="security-section-icon indigo" style={{ background: 'var(--indigo-bg)', color: 'var(--indigo)' }}>
            <RefreshCw size={20} />
          </div>
          <div>
            <div className="security-section-title">App Updates &amp; Cache</div>
            <div className="security-section-desc">Clear cached assets and force-fetch the latest app version</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flex: '1 1 200px' }}>
            Experiencing display issues or want to pull the latest deployment update immediately? Perform a hard refresh.
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleHardRefresh}
            disabled={hardRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            {hardRefreshing ? (
              <>
                <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                Clearing Cache...
              </>
            ) : refreshSuccess ? (
              <>
                <CheckCircle2 size={14} color="var(--green)" />
                Reloading App...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Hard Refresh App
              </>
            )}
          </button>
        </div>
      </div>

      {/* Legal & Support Section */}
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

      {/* iOS Install Modal */}
      {showIOSModal && (
        <div className="modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Share size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Install on iOS Safari</h3>
            </div>
            <ol style={{ paddingLeft: 20, margin: '0 0 20px 0', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <li style={{ marginBottom: 8 }}>
                Open Accountize in <strong>Safari</strong> on your iPhone or iPad.
              </li>
              <li style={{ marginBottom: 8 }}>
                Tap the <strong>Share</strong> button <Share size={14} style={{ verticalAlign: 'middle', display: 'inline' }} /> at the bottom navigation bar.
              </li>
              <li>
                Scroll down and select <strong>Add to Home Screen</strong>.
              </li>
            </ol>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowIOSModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
