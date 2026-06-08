import { supabase } from './supabase'

// ============ ACCOUNTS ============

export async function getAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createAccount(account) {
  const { data, error } = await supabase
    .from('accounts')
    .insert(account)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAccount(id, updates) {
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAccount(id) {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============ TRANSACTIONS ============

export async function getTransactions(monthYear) {
  let query = supabase
    .from('transactions')
    .select('*, accounts(name, type)')
    .order('created_at', { ascending: false })
  
  if (monthYear) {
    query = query.eq('month_year', monthYear)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTransactionsByAccount(accountId, monthYear) {
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
}

export async function createTransaction(transaction) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select('*, accounts(name, type)')
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateTransaction(id, updates) {
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
  let query = supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: true })
  
  if (monthYear) {
    query = query.eq('month_year', monthYear)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createExpense(expense) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createExpenses(expensesList) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expensesList)
    .select()
  if (error) throw error
  return data
}

export async function deleteExpense(id) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============ MONTHLY SUMMARIES ============

export async function getMonthlySummary(monthYear) {
  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('*')
    .eq('month_year', monthYear)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertMonthlySummary(summary) {
  const { data, error } = await supabase
    .from('monthly_summaries')
    .upsert(summary, { onConflict: 'month_year' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ COMPUTED HELPERS ============

export async function getAccountBalances(monthYear) {
  // Get all accounts
  const accounts = await getAccounts()
  
  // Get all transactions for this month
  const transactions = await getTransactions(monthYear)
  
  // Calculate net balance per account
  const balances = accounts.map(account => {
    const accountTxns = transactions.filter(t => t.account_id === account.id)
    const total = accountTxns.reduce((sum, t) => sum + (t.amount || 0), 0)
    return {
      ...account,
      transactions: accountTxns,
      balance: total
    }
  })
  
  return balances
}

export async function getDashboardData(monthYear) {
  const balances = await getAccountBalances(monthYear)
  const expenses = await getExpenses(monthYear)
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
    .filter(a => a.name?.toLowerCase().includes('cash'))
    .reduce((s, a) => s + a.balance, 0)
  const expenseAllotted = selfAccounts
    .filter(a => {
      const name = a.name?.toLowerCase() || ''
      return name.includes('expense') || name.includes('expence')
    })
    .reduce((s, a) => s + a.balance, 0)
  const rawOnlineBalance = selfAccounts
    .filter(a => {
      const name = a.name?.toLowerCase() || ''
      return !name.includes('cash') && !name.includes('expense') && !name.includes('expence') && !name.includes('bank')
    })
    .reduce((s, a) => s + a.balance, 0)
  const onlineBalance = rawOnlineBalance + expenseAllotted - totalExpenses
  const selfTotal = cashBalance + onlineBalance
  
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
    onlineBalance,
    expenseAllotted,
    totalAssets,
    availableBalance,
    expenses,
    totalExpenses,
    daysTracked,
    perDayAvg,
    summary,
  }
}

export async function getActiveMonths() {
  const { data: txns, error: txnErr } = await supabase
    .from('transactions')
    .select('month_year')
  if (txnErr) throw txnErr

  const { data: exps, error: expErr } = await supabase
    .from('expenses')
    .select('date')
  if (expErr) throw expErr

  const monthsSet = new Set()
  
  // Add current month by default
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  monthsSet.add(currentMonthStr)
  
  // Add next month by default
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  monthsSet.add(nextMonthStr)

  if (txns) {
    txns.forEach(t => {
      if (t.month_year) monthsSet.add(t.month_year)
    })
  }

  if (exps) {
    exps.forEach(e => {
      if (e.date) {
        const parts = e.date.split('-')
        if (parts.length >= 2) {
          monthsSet.add(`${parts[0]}-${parts[1]}`)
        }
      }
    })
  }

  const sortedMonths = Array.from(monthsSet).sort().reverse()
  
  return sortedMonths.map(value => {
    const [year, month] = value.split('-').map(Number)
    const d = new Date(year, month - 1, 1)
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    return { value, label }
  })
}

// ============ SETTINGS ============

export async function getSetting(key, defaultValue = '') {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // Single row not found
        return defaultValue
      }
      throw error
    }
    return data?.value || defaultValue
  } catch (err) {
    console.warn(`Settings query for '${key}' failed:`, err)
    return defaultValue
  }
}

export async function setSetting(key, value) {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    
    if (error) throw error
  } catch (err) {
    console.error(`Failed to save setting '${key}' to database:`, err)
  }
}
