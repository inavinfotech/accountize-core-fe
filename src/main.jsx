import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register PWA Service Worker with auto-update
registerSW({ immediate: true })

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
    <App />
  </StrictMode>,
)
