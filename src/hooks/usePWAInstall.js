import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')

      setIsStandalone(isStandaloneMode)
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent || ''
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
    setIsIOS(isIOSDevice)

    checkStandalone()

    // Listen for display mode media query changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleMediaChange = (e) => setIsStandalone(e.matches)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange)
    }

    // Capture PWA install prompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    // Track app installation completion
    const handleAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange)
      }
    }
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const choiceResult = await deferredPrompt.userChoice
    if (choiceResult.outcome === 'accepted') {
      setInstalled(true)
      setDeferredPrompt(null)
      return true
    }
    return false
  }

  return {
    canInstall: Boolean(deferredPrompt),
    isStandalone,
    isIOS,
    installed,
    triggerInstall
  }
}
