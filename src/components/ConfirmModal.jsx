import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ title, message, onConfirm, onClose, confirmText = 'Delete', type = 'danger' }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: type === 'danger' ? 'var(--red)' : 'var(--accent-primary)' }}>
            <AlertTriangle size={20} />
            {title}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div style={{ margin: '12px 0 24px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {message}
        </div>
        <div className="modal-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
            onClick={() => {
              onConfirm()
              onClose()
            }}
            style={{
              background: type === 'danger' ? 'var(--red)' : undefined,
              color: type === 'danger' ? '#fff' : undefined,
              border: type === 'danger' ? 'none' : undefined
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
