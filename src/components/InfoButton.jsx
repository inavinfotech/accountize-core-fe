import { useState } from 'react'
import { Info, X, HelpCircle, Calculator } from 'lucide-react'
import Modal from './Modal'
import { METRIC_DEFS } from '../data/metricDefs'


export default function InfoButton({ metricId, contextValues = {} }) {
  const [isOpen, setIsOpen] = useState(false)
  const def = METRIC_DEFS[metricId]

  if (!def) {
    console.warn(`No info definition found for metric: ${metricId}`)
    return null
  }

  return (
    <>
      <button
        type="button"
        className="info-button-trigger"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)}
        }
        title="View calculation info"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'all 0.2s',
          marginLeft: '4px',
          verticalAlign: 'middle'
        }}
        onMouseEnter={(e) => {
          e.target.style.color = 'var(--accent-primary)'
          e.target.style.background = 'rgba(99, 102, 241, 0.08)'
        }}
        onMouseLeave={(e) => {
          e.target.style.color = 'var(--text-muted)'
          e.target.style.background = 'none'
        }}
      >
        <Info size={14} />
      </button>

      {isOpen && (
        <Modal title="Calculation Reference" onClose={() => setIsOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.85rem' }}>
            
            {/* Header / Metric Title */}
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {def.title}
              </h4>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {def.description}
              </p>
            </div>


            {/* Formula Block */}
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10
            }}>
              <Calculator size={18} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 2 }}>
                  System Logic Formula
                </div>
                <code style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap'
                }}>
                  {def.formula}
                </code>
              </div>
            </div>

            {/* Variables breakdown */}
            {def.variables && def.variables.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Formula Inputs & Variables:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {def.variables.map((v, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', paddingLeft: 8, borderLeft: '2px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>{v.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{v.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Calculation section */}
            {def.getLiveCalculation && (
              <div style={{
                background: 'var(--indigo-bg)',
                border: '1px solid var(--indigo-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, color: 'var(--indigo)', marginBottom: 4 }}>
                  Current Live Calculation (For this Month)
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--indigo)'
                }}>
                  {def.getLiveCalculation(contextValues)}
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setIsOpen(false)}>
                Close Reference
              </button>
            </div>

          </div>
        </Modal>
      )}
    </>
  )
}
