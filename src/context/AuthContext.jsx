/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { analytics } from '../lib/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMfaRequired, setIsMfaRequired] = useState(false)

  useEffect(() => {
    // Check active session on mount (with timeout to prevent white screen hang)
    async function getInitialSession() {
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timed out')), 10000)
        )
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise])
        if (error) throw error
        setSession(session)
        setUser(session?.user ?? null)
        if (session) {
          const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (!aalError && data) {
            setIsMfaRequired(data.currentLevel === 'aal1' && data.nextLevel === 'aal2')
          }
        }
      } catch (err) {
        console.error('Error getting initial session:', err)
        // On timeout or error, clear auth state so app doesn't hang on white screen
        setSession(null)
        setUser(null)
        setIsMfaRequired(false)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) {
        try {
          const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (!aalError && data) {
            setIsMfaRequired(data.currentLevel === 'aal1' && data.nextLevel === 'aal2')
          } else {
            setIsMfaRequired(false)
          }
        } catch (err) {
          console.error('Error checking AAL:', err)
          setIsMfaRequired(false)
        }
      } else {
        setIsMfaRequired(false)
      }
      setLoading(false)
    })

    return () => {
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
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // ── OAuth (Google / GitHub) ──
  const signInWithOAuth = async (provider, options = {}) => {
    const targetUrl = options.redirectTo || window.location.origin
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

  const value = {
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
  }

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
