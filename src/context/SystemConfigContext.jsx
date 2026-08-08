/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SystemConfigContext = createContext(null)

export function SystemConfigProvider({ children }) {
  const [config, setConfig] = useState({
    login: { enabled: true, message: '' },
    signup: { enabled: true, message: '' },
    user_panel: { enabled: true, message: '' }
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
          }
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

  const value = {
    config,
    loading,
    isLoginEnabled: config.login.enabled,
    loginBlockMessage: config.login.message,
    isSignupEnabled: config.signup.enabled,
    signupBlockMessage: config.signup.message,
    isUserPanelEnabled: config.user_panel.enabled,
    userPanelBlockMessage: config.user_panel.message,
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
