import { CreditCard, Crown, Zap, User, Receipt, Download } from 'lucide-react'
import { exportPaymentInvoicePDF } from '../../lib/pdfExport'

export default function BillingTab({
  subscription,
  setShowUpgradeModal,
  user,
}) {
  const { isPro, isTrial, trialDaysLeft, subBillingCycle, currentPeriodEnd, receipts } = subscription

  return (
    <div className="settings-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Plan Status */}
      <div className="card">
        <div className="security-section-header">
          <div className="security-section-icon indigo" style={{ background: 'var(--indigo-bg)', color: 'var(--indigo)' }}>
            <CreditCard size={20} />
          </div>
          <div>
            <div className="security-section-title">Subscription Plan</div>
            <div className="security-section-desc">Manage your subscription plan and features</div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px',
          marginTop: 16,
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
              flexShrink: 0
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

      {/* Invoices & Billing History Section */}
      <div className="card">
        <div className="security-section-header">
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

        <div style={{ marginTop: 16 }}>
          {receipts && receipts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {receipts.map(rcpt => (
                <div key={rcpt.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)',
                  transition: 'all 0.2s', flexWrap: 'wrap', gap: 10
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
      </div>
    </div>
  )
}
