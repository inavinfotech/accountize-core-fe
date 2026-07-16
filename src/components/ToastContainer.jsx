import { useNotifications } from '../context/NotificationContext'
import { 
  X, CheckCircle2, XCircle, Info, AlertTriangle 
} from 'lucide-react'
import { useEffect, useState } from 'react'

function ToastItem({ toast }) {
  const { id, type, title, message } = toast
  const [isClosing, setIsClosing] = useState(false)

  const getIcon = () => {
    switch (type) {
      case 'approved':
        return <CheckCircle2 size={18} style={{ color: 'var(--green)' }} />
      case 'rejected':
        return <XCircle size={18} style={{ color: 'var(--red)' }} />
      case 'pending':
        return <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
      default:
        return <Info size={18} style={{ color: 'var(--blue)' }} />
    }
  }

  return (
    <div className={`toast-item ${type} ${isClosing ? 'slide-out' : 'slide-in'}`}>
      <div className="toast-icon-wrapper">
        {getIcon()}
      </div>
      <div className="toast-content">
        <span className="toast-title">{title}</span>
        <p className="toast-message">{message}</p>
      </div>
      <button 
        className="toast-close-btn"
        onClick={() => setIsClosing(true)}
      >
        <X size={14} />
      </button>
      <div className="toast-progress-bar" />
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
