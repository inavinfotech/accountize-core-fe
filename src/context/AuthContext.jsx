/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { analytics } from '../lib/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMfaRequired, setIsMfaRequired] = useState(false)

  useEffect(() => {
    let isMounted = true

    // Helper to evaluate MFA step-up without deadlocking Supabase internal auth lock
    const evaluateMfaState = (currentSession) => {
      if (!currentSession) {
        if (isMounted) setIsMfaRequired(false)
        return
      }

      // Defer async getAuthenticatorAssuranceLevel to next event loop tick so WebLock is released
      setTimeout(async () => {
        if (!isMounted) return
        try {
          const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (!aalError && aalData && isMounted) {
            setIsMfaRequired(aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2')
          } else if (isMounted) {
            setIsMfaRequired(false)
          }
        } catch {
          if (isMounted) setIsMfaRequired(false)
        }
      }, 0)
    }

    // Safety fallback timer to prevent infinite loading screen if storage/network is stalled
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false)
      }
    }, 4000)

    // Primary Auth Listener: Supabase v2 immediately emits INITIAL_SESSION on subscribe
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      clearTimeout(fallbackTimer)
      if (!isMounted) return

      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      evaluateMfaState(currentSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  // ── Email / Password ──
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    analytics.userSignedIn('email')
    return data
  }

  const signUp = async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options.emailRedirectTo || window.location.origin,
      },
    })
    if (error) throw error
    analytics.signUpCompleted(email, 'email')
    analytics.userSignedIn('email')
    return data
  }

  const signOut = async () => {
    analytics.userSignedOut()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // ── OAuth (Google / GitHub) ──
  const signInWithOAuth = async (provider, options = {}) => {
    const targetUrl = options.redirectTo || window.location.origin
    analytics.userSignedIn(provider)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: targetUrl,
      },
    })
    if (error) throw error
    return data
  }

  // ── Magic Link ──
  const signInWithMagicLink = async (email, options = {}) => {
    const targetUrl = options.emailRedirectTo || window.location.origin
    analytics.userSignedIn('magic_link')
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: targetUrl,
      },
    })
    if (error) throw error
    return data
  }

  // ── MFA (TOTP) ──
  const enrollMFA = async (friendlyName = 'Authenticator App') => {
    try {
      // Fetch factors and clean up any existing unverified ones to avoid duplicate errors
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      if (factorsData?.all) {
        const unverified = factorsData.all.filter(f => f.status === 'unverified')
        for (const factor of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id })
        }
      }
    } catch (err) {
      console.warn('Failed to clean up prior unverified factors:', err)
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    })
    if (error) throw error
    return data
  }

  const challengeAndVerifyMFA = async (factorId, code) => {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })
    if (error) throw error
    return data
  }

  const unenrollMFA = async (factorId) => {
    const { data, error } = await supabase.auth.mfa.unenroll({
      factorId,
    })
    if (error) throw error
    return data
  }

  const getAssuranceLevel = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) throw error
    return data
  }

  const getMFAFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    return data
  }

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return data
  }

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isMfaRequired,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    signInWithMagicLink,
    updatePassword,
    enrollMFA,
    challengeAndVerifyMFA,
    unenrollMFA,
    getAssuranceLevel,
    getMFAFactors,
  }), [user, session, loading, isMfaRequired])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
