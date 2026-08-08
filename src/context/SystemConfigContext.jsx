/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SystemConfigContext = createContext(null)

export function SystemConfigProvider({ children }) {
  const [config, setConfig] = useState({
    login: { enabled: true, message: '' },
    signup: { enabled: true, message: '' },
    user_panel: { enabled: true, message: '' },
    bypass_users: ''
  })
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_public_system_config')
      if (error) {
        console.warn('[SystemConfig] Error fetching system config, defaulting to enabled:', error.message || error)
        return
      }
      if (data) {
        // bypass_users value can be in raw_value or message
        const rawBypass = data.bypass_users?.raw_value || data.bypass_users?.message || ''
        setConfig({
          login: {
            enabled: data.login_enabled?.enabled ?? true,
            message: data.login_enabled?.message || ''
          },
          signup: {
            enabled: data.signup_enabled?.enabled ?? true,
            message: data.signup_enabled?.message || ''
          },
          user_panel: {
            enabled: data.user_panel_enabled?.enabled ?? true,
            message: data.user_panel_enabled?.message || ''
          },
          bypass_users: rawBypass
        })
      }
    } catch (err) {
      console.error('[SystemConfig] Failed to load config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Parse bypass users list into array of normalized strings
  const getBypassList = useCallback(() => {
    if (!config.bypass_users) return []
    return config.bypass_users
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  }, [config.bypass_users])

  // Check if a user (object or email/UUID string) is exempt from maintenance blocks
  const isUserBypassed = useCallback((userOrIdentifier) => {
    if (!userOrIdentifier) return false

    const email = typeof userOrIdentifier === 'object' ? userOrIdentifier?.email : userOrIdentifier
    const userId = typeof userOrIdentifier === 'object' ? userOrIdentifier?.id : userOrIdentifier

    const lowerEmail = email ? String(email).trim().toLowerCase() : ''
    const lowerId = userId ? String(userId).trim().toLowerCase() : ''

    // Super Admin domain / email auto-bypass
    if (lowerEmail && (
      lowerEmail.endsWith('@inexarum.com') ||
      lowerEmail.endsWith('@inexarum.in') ||
      lowerEmail === 'admin@accountize.app'
    )) {
      return true
    }

    const bypassList = getBypassList()
    if (bypassList.length === 0) return false

    return (
      (lowerEmail && bypassList.includes(lowerEmail)) ||
      (lowerId && bypassList.includes(lowerId))
    )
  }, [getBypassList])

  const value = {
    config,
    loading,
    isLoginEnabled: config.login.enabled,
    loginBlockMessage: config.login.message,
    isSignupEnabled: config.signup.enabled,
    signupBlockMessage: config.signup.message,
    isUserPanelEnabled: config.user_panel.enabled,
    userPanelBlockMessage: config.user_panel.message,
    bypassUsers: config.bypass_users,
    isUserBypassed,
    refreshConfig: fetchConfig
  }

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  )
}

export function useSystemConfig() {
  const context = useContext(SystemConfigContext)
  if (!context) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider')
  }
  return context
}
