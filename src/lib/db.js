import { supabase } from './supabase'
import { analytics } from './analytics'

let activeMonthsCache = null

// ============ CACHE ============
const dbCache = new Map()

export function clearDbCache() {
  dbCache.clear()
  activeMonthsCache = null
}

// ============ ACCOUNTS ============

export async function getAccounts() {
  const cacheKey = 'accounts'
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function createAccount(account) {
  clearDbCache()
  const { data, error } = await supabase
    .from('accounts')
    .insert(account)
    .select()
    .single()
  if (error) throw error
  if (data) {
    analytics.accountCreated(data.type, data.subtype)
  }
  return data
}

export async function updateAccount(id, updates) {
  clearDbCache()
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export function isDefaultAccount(account) {
  if (!account) return false
  if (account.type !== 'self') return false
  const nameLower = (account.name || '').trim().toLowerCase()
  return (
    nameLower === 'cash in hand' ||
    nameLower === 'online money' ||
    nameLower === 'expence money' ||
    nameLower === 'expense money'
  )
}

export async function deleteAccount(id) {
  const { data: acc } = await supabase.from('accounts').select('id, name, type, subtype').eq('id', id).maybeSingle()
  if (acc && isDefaultAccount(acc)) {
    throw new Error(`Default system account "${acc.name}" cannot be deleted as it is required for automated balance tracking.`)
  }
  clearDbCache()
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============ TRANSACTIONS ============

export async function getTransactions(monthYear) {
  const cacheKey = `transactions_${monthYear || 'all'}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    let query = supabase
      .from('transactions')
      .select('*, accounts(name, type)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
    
    if (monthYear) {
      query = query.eq('month_year', monthYear)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function getTransactionsByAccount(accountId, monthYear) {
  const cacheKey = `transactions_account_${accountId}_${monthYear || 'all'}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })
    
    if (monthYear) {
      query = query.eq('month_year', monthYear)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function createTransaction(transaction) {
  clearDbCache()
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select('*, accounts(name, type)')
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id) {
  clearDbCache()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateTransaction(id, updates) {
  clearDbCache()
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select('*, accounts(name, type)')
    .single()
  if (error) throw error
  return data
}

// ============ EXPENSES ============

export async function getExpenses(monthYear) {
  const cacheKey = `expenses_${monthYear || 'all'}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (monthYear) {
      query = query.eq('month_year', monthYear)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function createExpense(expense) {
  clearDbCache()
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createExpenses(expensesList) {
  clearDbCache()
  const now = new Date()
  const listWithTime = expensesList.map((exp, idx) => ({
    ...exp,
    created_at: new Date(now.getTime() + idx * 1000).toISOString()
  }))
  const { data, error } = await supabase
    .from('expenses')
    .insert(listWithTime)
    .select()
  if (error) throw error
  return data
}

export async function deleteExpense(id) {
  clearDbCache()
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateExpense(id, updates) {
  clearDbCache()
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ MONTHLY SUMMARIES ============

export async function getMonthlySummary(monthYear) {
  const cacheKey = `summary_${monthYear}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    const { data, error } = await supabase
      .from('monthly_summaries')
      .select('*')
      .eq('month_year', monthYear)
      .maybeSingle()
    if (error) throw error
    return data
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function upsertMonthlySummary(summary) {
  clearDbCache()
  const { data: { user } } = await supabase.auth.getUser()
  const existing = await getMonthlySummary(summary.month_year).catch(() => null)

  const payload = {
    ...summary,
    ...(user?.id ? { user_id: user.id } : {}),
    ...(existing?.id ? { id: existing.id } : {})
  }

  const { data, error } = await supabase
    .from('monthly_summaries')
    .upsert(payload, { onConflict: 'user_id,month_year' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ COMPUTED HELPERS ============

export async function ensureDefaultAccounts() {
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, type, subtype')
    if (error) throw error

    const selfAccounts = (accounts || []).filter(a => a.type === 'self')
    const hasCash = selfAccounts.some(a => a.subtype === 'cash')
    const hasOnline = selfAccounts.some(a => a.subtype === 'online')
    const hasExpense = selfAccounts.some(a => a.subtype === 'expense' || (a.name && a.name.toLowerCase().includes('expen')))

    const missing = []
    if (!hasCash) missing.push({ name: 'Cash In Hand', type: 'self', subtype: 'cash' })
    if (!hasOnline) missing.push({ name: 'Online Money', type: 'self', subtype: 'online' })
    if (!hasExpense) missing.push({ name: 'Expence Money', type: 'self', subtype: 'expense' })

    if (missing.length > 0) {
      for (const item of missing) {
        await supabase.from('accounts').insert(item)
      }
      clearDbCache()
      return true
    }
  } catch (err) {
    console.error('Failed to auto-ensure default accounts:', err)
  }
  return false
}

export async function getAccountBalances(monthYear) {
  await ensureDefaultAccounts()
  const cacheKey = `balances_${monthYear}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    // Get all accounts with balances from RPC
    const { data: accounts, error: accountErr } = await supabase
      .rpc('get_account_balances_up_to', { month_year_param: monthYear })
    if (accountErr) throw accountErr
    
    // Get current month transactions
    const currentTransactions = await getTransactions(monthYear)
    
    // Map current transactions to each account (sorted newest first)
    const balances = accounts.map(account => {
      const currentTxns = currentTransactions
        .filter(t => t.account_id === account.id)
        .sort((a, b) => {
          const timeA = new Date(a.created_at).getTime()
          const timeB = new Date(b.created_at).getTime()
          if (timeB !== timeA) return timeB - timeA
          return (b.id || '').localeCompare(a.id || '')
        })
      return {
        ...account,
        transactions: currentTxns
      }
    })
    
    return balances
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function getDashboardData(monthYear) {
  const cacheKey = `dashboard_${monthYear}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    const balances = await getAccountBalances(monthYear)
    const expenses = await getExpenses(monthYear)
    
    // Call server-side function to get total expenses up to this month
    const { data: totalExpensesUpTo, error: expErr } = await supabase
      .rpc('get_total_expenses_up_to', { month_year_param: monthYear })
    if (expErr) throw expErr

    // Call server-side function to get carrying online balance up to this month (efficient carryover)
    const { data: onlineBalance, error: onlineErr } = await supabase
      .rpc('get_online_balance_up_to', { month_year_param: monthYear })
    if (onlineErr) throw onlineErr
    
    const summary = await getMonthlySummary(monthYear)
    
    const receivables = balances.filter(a => a.type === 'receivable')
    const payables = balances.filter(a => a.type === 'payable')
    const selfAccounts = balances.filter(a => a.type === 'self')
    
    const totalReceivables = receivables.reduce((s, a) => s + a.balance, 0)
    const totalPayables = payables.reduce((s, a) => s + a.balance, 0)
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    
    const daysTracked = new Set(expenses.map(e => e.date)).size
    const perDayAvg = daysTracked > 0 ? totalExpenses / daysTracked : 0

    const cashBalance = selfAccounts
      .filter(a => a.subtype === 'cash')
      .reduce((s, a) => s + a.balance, 0)
    const expenseAllotted = selfAccounts
      .filter(a => a.subtype === 'expense')
      .reduce((s, a) => s + a.balance, 0)
    const rawOnlineBalance = selfAccounts
      .filter(a => a.subtype === 'online')
      .reduce((s, a) => s + a.balance, 0)
    const bankBalance = selfAccounts
      .filter(a => a.subtype === 'bank')
      .reduce((s, a) => s + a.balance, 0)
    
    const settledExpenses = selfAccounts
      .filter(a => a.subtype === 'expense')
      .reduce((sum, a) => {
        const settles = (a.transactions || []).filter(t => t.description === 'Settle Monthly Expenses')
        return sum + settles.reduce((s, t) => s + Math.abs(t.amount || 0), 0)
      }, 0)

    const finalOnlineBalance = rawOnlineBalance + expenseAllotted - (totalExpenses - settledExpenses)
    const selfTotal = cashBalance + finalOnlineBalance + bankBalance
    
    const hasCash = selfAccounts.some(a => a.subtype === 'cash')
    const hasOnline = selfAccounts.some(a => a.subtype === 'online')
    const hasExpense = selfAccounts.some(a => a.subtype === 'expense' || (a.name && a.name.toLowerCase().includes('expen')))

    const missingDefaults = []
    if (!hasCash) missingDefaults.push({ name: 'Cash In Hand', type: 'self', subtype: 'cash' })
    if (!hasOnline) missingDefaults.push({ name: 'Online Money', type: 'self', subtype: 'online' })
    if (!hasExpense) missingDefaults.push({ name: 'Expence Money', type: 'self', subtype: 'expense' })

    const totalAssets = totalReceivables + selfTotal
    const availableBalance = totalAssets - totalPayables
    
    return {
      balances,
      receivables,
      payables,
      selfAccounts,
      totalReceivables,
      totalPayables,
      cashBalance,
      rawOnlineBalance,
      onlineBalance: finalOnlineBalance,
      bankBalance,
      expenseAllotted,
      settledExpenses,
      totalAssets,
      availableBalance,
      expenses,
      totalExpenses,
      totalExpensesUpTo,
      daysTracked,
      perDayAvg,
      summary,
      missingDefaults,
    }
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function getActiveMonths() {
  if (activeMonthsCache) {
    return activeMonthsCache
  }

  const { data, error } = await supabase
    .rpc('get_active_months')
  if (error) throw error

  const monthsSet = new Set()
  
  // Add current month by default
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  monthsSet.add(currentMonthStr)
  
  // Add next month by default
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  monthsSet.add(nextMonthStr)

  if (data) {
    data.forEach(row => {
      if (row.month_year) {
        monthsSet.add(row.month_year)
      }
    })
  }

  const sortedMonths = Array.from(monthsSet).sort().reverse()
  
  activeMonthsCache = sortedMonths.map(value => {
    const [year, month] = value.split('-').map(Number)
    const d = new Date(year, month - 1, 1)
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    return { value, label }
  })

  return activeMonthsCache
}

// ============ SETTINGS ============

export async function getSetting(key, defaultValue = '') {
  const cacheKey = `setting_${key}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      
      if (error) throw error
      return data?.value || defaultValue
    } catch (err) {
      console.warn(`Settings query for '${key}' failed:`, err)
      return defaultValue
    }
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function setSetting(key, value) {
  clearDbCache()
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('settings')
      .upsert({ 
        user_id: user.id,
        key, 
        value, 
        updated_at: new Date().toISOString() 
      })
    
    if (error) throw error
  } catch (err) {
    console.error(`Failed to save setting '${key}' to database:`, err)
  }
}

// ============ SHARED LINKS ============

export async function getSharedLink(accountId) {
  const cacheKey = `shared_link_${accountId}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()
    if (error) throw error
    return data
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function createSharedLink(accountId) {
  clearDbCache()
  // Check if one already exists
  const existing = await getSharedLink(accountId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('shared_links')
    .insert({ account_id: accountId })
    .select()
    .single()
  if (error) throw error
  if (data) {
    analytics.sharedLedgerCreated('receivable', data.id)
  }
  return data
}

export async function deleteSharedLink(accountId) {
  clearDbCache()
  const { error } = await supabase
    .from('shared_links')
    .delete()
    .eq('account_id', accountId)
  if (error) throw error
}

export async function getSharedLedger(token) {
  const cacheKey = `shared_ledger_${token}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    const { data, error } = await supabase
      .rpc('get_shared_ledger', { link_token: token })
    if (error) throw error
    if (!data) return null

    const balance = (data.transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0)

    return {
      account: data.account,
      transactions: data.transactions || [],
      balance,
      sharedAt: data.sharedAt
    }
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

// ============ COLLABORATIVE / LINKED LEDGERS ============

export async function linkSharedAccount(token, payableAccountId) {
  clearDbCache()
  const { data, error } = await supabase
    .rpc('link_shared_ledger', { link_token: token, user_payable_account_id: payableAccountId })
  if (error) throw error
  if (data?.link_id) {
    analytics.sharedLedgerLinked(data.link_id)
  }
  return data
}

export async function getLinkedAccount(accountId) {
  const cacheKey = `linked_account_${accountId}`
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)

  const promise = (async () => {
    const { data, error } = await supabase
      .from('linked_accounts')
      .select('*')
      .or(`receivable_account_id.eq.${accountId},payable_account_id.eq.${accountId}`)
      .maybeSingle()
    if (error) throw error
    return data
  })()

  dbCache.set(cacheKey, promise)
  return promise
}

export async function getLinkedAccounts() {
  const { data, error } = await supabase
    .from('linked_accounts')
    .select('*')
  if (error) throw error
  return data
}

export async function verifyTransaction(transactionId) {
  clearDbCache()
  const { data, error } = await supabase
    .from('transactions')
    .update({ verification_status: 'completed' })
    .eq('id', transactionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectTransaction(transactionId) {
  clearDbCache()
  const { data, error } = await supabase
    .from('transactions')
    .update({ verification_status: 'rejected' })
    .eq('id', transactionId)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPendingTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, accounts(name, type)')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
