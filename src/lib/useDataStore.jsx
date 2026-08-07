/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentMonth, getMonthOptions } from './utils'
import {
  getActiveMonths,
  getDashboardData,
  getAccountBalances,
  getExpenses,
  getSetting,
  getLinkedAccounts,
  getAllSharedLinks,
  getTransactions,
  getAccounts,
  ensureDefaultAccounts,
  invalidateCache,
} from './db'

const DataStoreContext = createContext(null)

/**
 * DataStoreProvider — Centralized data fetching and caching layer.
 * 
 * Replaces per-page data fetching with a single store that:
 * 1. Pre-fetches all core data in parallel on mount
 * 2. Caches and shares data across all pages
 * 3. Supports targeted invalidation (only refetch what changed)
 * 4. Auto-refetches when the active month changes
 */
export function DataStoreProvider({ children }) {
  // ── Month state (migrated from AppContext) ──
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())
  const [monthOptions, setMonthOptions] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  // ── Core data ──
  const [dashboardData, setDashboardData] = useState(null)
  const [balances, setBalances] = useState([])
  const [expenses, setExpenses] = useState([])
  const [allTransactions, setAllTransactions] = useState(null) // all-months transactions (for Transactions page)
  const [allAccounts, setAllAccounts] = useState(null) // raw accounts list (for Transactions page)
  const [linkedAccounts, setLinkedAccounts] = useState([])
  const [sharedLinks, setSharedLinks] = useState({})
  const [budgetPerDay, setBudgetPerDay] = useState('0')

  // ── Loading states ──
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── Refs to prevent stale closures ──
  const currentMonthRef = useRef(currentMonth)
  currentMonthRef.current = currentMonth

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  // ── Load month options ──
  useEffect(() => {
    let active = true
    async function loadMonths() {
      try {
        const months = await getActiveMonths()
        if (active) setMonthOptions(months)
      } catch (err) {
        console.error('Failed to load active months:', err)
        if (active) setMonthOptions(getMonthOptions())
      }
    }
    loadMonths()
    return () => { active = false }
  }, [refreshKey])

  // ── Core data fetch ──
  const fetchCoreData = useCallback(async (month, isInitial = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true)
        // One-time: ensure default accounts exist
        await ensureDefaultAccounts()
      } else {
        setRefreshing(true)
      }

      // Fetch all core data in parallel
      const [
        dashData,
        linked,
        allLinks,
        budget,
      ] = await Promise.all([
        getDashboardData(month),
        getLinkedAccounts(),
        getAllSharedLinks(),
        getSetting('target_per_day_budget', '0'),
      ])

      setDashboardData(dashData)
      setBalances(dashData.balances)
      setExpenses(dashData.expenses)
      setLinkedAccounts(linked)
      setBudgetPerDay(budget)

      // Build shared links map from batch query
      const linksMap = {}
      allLinks.forEach(l => { linksMap[l.account_id] = l.token })
      setSharedLinks(linksMap)

    } catch (err) {
      console.error('DataStore: Failed to load core data:', err)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [])

  // ── Initial load + reload on month/refresh changes ──
  const isFirstLoad = useRef(true)

  useEffect(() => {
    const isFirst = isFirstLoad.current
    isFirstLoad.current = false
    fetchCoreData(currentMonth, isFirst)
  }, [currentMonth, refreshKey, fetchCoreData])

  // ── Scoped invalidation + refetch ──
  const invalidateAndRefresh = useCallback(async (scope) => {
    // Invalidate the db-level cache for this scope
    invalidateCache(scope)
    // Then refetch core data from the (now-cleared) cache
    await fetchCoreData(currentMonthRef.current, false)
  }, [fetchCoreData])

  // ── Lazy loaders for pages that need data beyond the core set ──
  const fetchAllTransactions = useCallback(async () => {
    if (allTransactions !== null) return allTransactions
    try {
      const [txs, accs] = await Promise.all([
        getTransactions(),
        getAccounts(),
      ])
      setAllTransactions(txs)
      setAllAccounts(accs)
      return txs
    } catch (err) {
      console.error('DataStore: Failed to load all transactions:', err)
      return []
    }
  }, [allTransactions])

  // Reset lazy data on refresh so it re-fetches next time
  useEffect(() => {
    setAllTransactions(null)
    setAllAccounts(null)
  }, [refreshKey])

  const value = {
    // Month state (from old AppContext)
    currentMonth,
    setCurrentMonth,
    monthOptions,
    refreshKey,
    triggerRefresh,

    // Core data
    dashboardData,
    balances,
    expenses,
    linkedAccounts,
    sharedLinks,
    setSharedLinks,
    budgetPerDay,

    // Lazy data (for Transactions page)
    allTransactions,
    allAccounts,
    fetchAllTransactions,

    // Loading
    initialLoading,
    refreshing,

    // Invalidation
    invalidateAndRefresh,
  }

  return (
    <DataStoreContext.Provider value={value}>
      {children}
    </DataStoreContext.Provider>
  )
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext)
  if (!ctx) {
    // Fallback for components used outside provider (e.g. shared ledger)
    return {
      currentMonth: getCurrentMonth(),
      setCurrentMonth: () => {},
      monthOptions: getMonthOptions(),
      refreshKey: 0,
      triggerRefresh: () => {},
      dashboardData: null,
      balances: [],
      expenses: [],
      linkedAccounts: [],
      sharedLinks: {},
      setSharedLinks: () => {},
      budgetPerDay: '0',
      allTransactions: null,
      allAccounts: null,
      fetchAllTransactions: async () => [],
      initialLoading: true,
      refreshing: false,
      invalidateAndRefresh: async () => {},
    }
  }
  return ctx
}

/**
 * Backward-compatible useApp() hook.
 * Components that only need month state can continue using this.
 */
export function useApp() {
  const store = useDataStore()
  return {
    currentMonth: store.currentMonth,
    setCurrentMonth: store.setCurrentMonth,
    monthOptions: store.monthOptions,
    refreshKey: store.refreshKey,
    triggerRefresh: store.triggerRefresh,
  }
}
