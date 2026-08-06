import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users, Award, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getUserReferralCode, getReferralStats } from '../lib/db'
import { analytics } from '../lib/analytics'

export default function ReferralCard() {
  const { user } = useAuth()
  const [referralCode, setReferralCode] = useState('')
  const [stats, setStats] = useState({ total: 0, completed: 0, rewarded: 0 })
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReferralData()
  }, [user])

  async function loadReferralData() {
    if (!user) return
    try {
      setLoading(true)
      const [code, referralStats] = await Promise.all([
        getUserReferralCode(),
        getReferralStats(),
      ])
      setReferralCode(code)
      setStats(referralStats)
    } catch (err) {
      console.error('Failed to load referral data:', err)
    } finally {
      setLoading(false)
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.accountize.in'
  const referralLink = referralCode
    ? `${baseUrl}/ref/${referralCode}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    analytics.referralLinkCopied(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{
        background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: 20, animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        <div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: '60%', marginBottom: 12 }} />
        <div style={{ height: 40, background: '#e2e8f0', borderRadius: 8, marginBottom: 12 }} />
        <div style={{ height: 12, background: '#e2e8f0', borderRadius: 4, width: '40%' }} />
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
      border: '1px solid #e0e7ff',
      borderRadius: 12,
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Gift size={18} color="white" />
        </div>
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Invite & Earn
          </h3>
          <p style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600, margin: 0 }}>
            Get 1 month free Pro for each friend who joins
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
      }}>
        <div style={{
          flex: 1, padding: '10px 14px',
          background: 'white', border: '1px solid #e2e8f0',
          borderRadius: 8, fontSize: '0.72rem', color: '#475569',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: 'monospace',
        }}>
          {referralLink || 'Loading...'}
        </div>
        <button
          onClick={handleCopy}
          disabled={!referralCode}
          style={{
            padding: '10px 14px',
            background: copied ? '#059669' : '#2a498c',
            color: 'white', border: 'none', borderRadius: 8,
            cursor: referralCode ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.7rem', fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
      }}>
        <div style={{
          background: 'white', borderRadius: 8, padding: '10px 12px',
          textAlign: 'center', border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <ExternalLink size={11} color="#6366f1" />
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Invited
            </span>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            {stats.total}
          </span>
        </div>
        <div style={{
          background: 'white', borderRadius: 8, padding: '10px 12px',
          textAlign: 'center', border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <Users size={11} color="#10b981" />
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Joined
            </span>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            {stats.completed}
          </span>
        </div>
        <div style={{
          background: 'white', borderRadius: 8, padding: '10px 12px',
          textAlign: 'center', border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <Award size={11} color="#f59e0b" />
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Rewards
            </span>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            {stats.rewarded}
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 12, lineHeight: 1.5, textAlign: 'center' }}>
        When your friend signs up through your link, you both benefit. They get a 30-day Pro trial, and you earn 1 month of free Pro.
      </p>
    </div>
  )
}
