/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCurrentMonth, getMonthOptions } from '../lib/utils'
import { getActiveMonths } from '../lib/db'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())
  const [refreshKey, setRefreshKey] = useState(0)
  const [monthOptions, setMonthOptions] = useState([])

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const months = await getActiveMonths()
        if (active) {
          setMonthOptions(months)
        }
      } catch (err) {
        console.error('Failed to load active months:', err)
        // Fallback to static rolling month options
        if (active) {
          setMonthOptions(getMonthOptions())
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [refreshKey])

  return (
    <AppContext.Provider value={{ currentMonth, setCurrentMonth, refreshKey, triggerRefresh, monthOptions }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
