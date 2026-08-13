import { RefreshCw, CheckCircle2, HelpCircle, MessageSquare, Lock, FileText } from 'lucide-react'

export default function SystemTab({
  handleHardRefresh,
  hardRefreshing,
  refreshSuccess,
  setShowSupportModal,
  setShowPrivacyModal,
  setShowTermsModal,
}) {
  return (
    <div className="settings-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
    </div>
  )
}
