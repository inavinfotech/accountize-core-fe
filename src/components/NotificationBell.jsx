import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { 
  Bell, Check, Trash2, Info, CheckCircle2, 
  XCircle, Clock, Eye, AlertTriangle 
} from 'lucide-react'

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

export default function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll 
  } = useNotifications()
  
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = (n) => {
    markAsRead(n.id)
    setIsOpen(false)
    if (n.type === 'pending') {
      navigate('/transactions?verification=pending')
    } else {
      navigate('/transactions')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'approved':
        return <CheckCircle2 size={16} className="notif-icon-approved" />
      case 'rejected':
        return <XCircle size={16} className="notif-icon-rejected" />
      case 'pending':
        return <AlertTriangle size={16} className="notif-icon-pending" />
      default:
        return <Info size={16} className="notif-icon-info" />
    }
  }

  return (
    <div className="notif-container" ref={dropdownRef}>
      <button 
        className={`notif-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Notifications"
        type="button"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3>Notifications</h3>
            <div className="notif-actions">
              {notifications.length > 0 && (
                <>
                  <button 
                    onClick={markAllAsRead} 
                    title="Mark all as read"
                    className="notif-action-btn"
                  >
                    <Eye size={14} /> Mark Read
                  </button>
                  <button 
                    onClick={clearAll} 
                    title="Clear all notifications"
                    className="notif-action-btn danger"
                  >
                    <Trash2 size={14} /> Clear
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} className="notif-empty-icon" />
                <p>No notifications yet</p>
                <span>Real-time approvals and rejects will appear here</span>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`notif-item ${n.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="notif-item-icon-wrapper">
                    {getIcon(n.type)}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-title-row">
                      <span className="notif-item-title">{n.title}</span>
                      <span className="notif-item-time">
                        <Clock size={10} style={{ marginRight: 2 }} />
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="notif-item-msg">{n.message}</p>
                  </div>
                  {!n.read && (
                    <button 
                      className="notif-item-check"
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(n.id)
                      }}
                      title="Mark as read"
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
