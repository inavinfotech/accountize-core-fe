import { Component } from 'react'

/**
 * Global Error Boundary — catches unhandled React rendering errors
 * and displays a recovery UI instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo)
  }

  handleReload = () => {
    // Clear all caches and do a hard reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }
    sessionStorage.clear()
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: '#f8fafc',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '32px 28px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '20px'
            }}>
              ⚠️
            </div>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px',
              letterSpacing: '-0.02em'
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: '13px',
              color: '#64748b',
              margin: '0 0 20px',
              lineHeight: 1.5
            }}>
              The app encountered an unexpected error. This can happen after an update. Tap below to reload.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
