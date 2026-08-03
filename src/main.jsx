import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

import { logError, trackEvent } from './lib/analytics'

// Register PWA Service Worker with auto-update & stale asset recovery
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // New service worker available — force update immediately to prevent
    // stale chunk references that cause white screens on app reopen
    updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] App is ready for offline use.')
  },
  onRegisterError(error) {
    console.error('[PWA] Service worker registration failed:', error)
  }
})

// Global error handlers for uncaught JS errors and unhandled promise rejections
window.onerror = (message, source, lineno, colno, error) => {
  const stack = error?.stack || `at ${source}:${lineno}:${colno}`
  logError(`[Window Error] ${message}`, stack, window.location.href)
}

window.onunhandledrejection = (event) => {
  const reason = event.reason
  const msg = reason?.message || String(reason || 'Unhandled Promise Rejection')
  const stack = reason?.stack || ''
  logError(`[Unhandled Rejection] ${msg}`, stack, window.location.href)
}

// Track PWA install event
window.addEventListener('appinstalled', () => {
  trackEvent('pwa_installed', { platform: navigator.userAgent })
})

// Handle chunk load failures gracefully on server updates
window.addEventListener('vite:preloadError', () => {
  console.warn('New deployment detected or asset chunk failed to load. Reloading application...')
  const reloaded = sessionStorage.getItem('chunk_reload')
  if (!reloaded) {
    sessionStorage.setItem('chunk_reload', 'true')
    window.location.reload()
  }
})

// Clear reload flag on clean app boot
sessionStorage.removeItem('chunk_reload')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

