import { formatCurrency } from '../lib/utils'

export const METRIC_DEFS = {
  // --- DASHBOARD CARDS ---
  availableBalance: {
    title: 'Available Balance',
    description: 'The net funds available to you after considering all assets and liabilities.',
    excelFormula: '= Total Assets - Total Liabilities',
    formula: 'Available Balance = Total Assets - Total Liabilities',
    variables: [
      { name: 'Total Assets', desc: 'Receivables + Self Accounts (Cash + Online + Banks)' },
      { name: 'Total Liabilities', desc: 'Total Payables (money you owe to others)' }
    ],
    getLiveCalculation: (data) => {
      const assets = data.totalReceivables + data.cashBalance + data.onlineBalance + data.bankBalance
      const liabilities = data.totalPayables
      const net = assets - liabilities
      return `${formatCurrency(assets)} (Assets) - ${formatCurrency(liabilities)} (Liabilities) = ${formatCurrency(net)}`
    }
  },
  totalReceivables: {
    title: 'Total Receivables',
    description: 'The total amount of money owed to you by other people or accounts.',
    excelFormula: '= SUM(Receivable Accounts Balances)',
    formula: 'Total Receivables = Sum of balances of all accounts of type "Receivable"',
    variables: [
      { name: 'Receivable Account Balance', desc: 'Cumulative sum of all transactions for each person/entity who owes you money' }
    ],
    getLiveCalculation: (data) => {
      return `Sum of all Receivable accounts = ${formatCurrency(data.totalReceivables)}`
    }
  },
  totalPayables: {
    title: 'Total Payables',
    description: 'The total amount of money you owe to other people or accounts.',
    excelFormula: '= SUM(Payable Accounts Balances)',
    formula: 'Total Payables = Sum of balances of all accounts of type "Payable"',
    variables: [
      { name: 'Payable Account Balance', desc: 'Cumulative sum of all transactions for each person/entity you owe money to' }
    ],
    getLiveCalculation: (data) => {
      return `Sum of all Payable accounts = ${formatCurrency(data.totalPayables)}`
    }
  },
  cashBalance: {
    title: 'Cash in Hand',
    description: 'The sum of physical cash currently in your possession.',
    excelFormula: '= SUM(Self Accounts with subtype "cash")',
    formula: 'Cash in Hand = Sum of cumulative balances of all Self accounts of subtype "cash"',
    variables: [
      { name: 'Self Accounts', desc: 'Accounts managed directly by you, representing cash, bank, or online funds' }
    ],
    getLiveCalculation: (data) => {
      return `Cash Accounts Balance = ${formatCurrency(data.cashBalance)}`
    }
  },
  onlineBalance: {
    title: 'Online Balance',
    description: 'Your estimated online balance (e.g. Paytm, GPay, etc.) adjusted for expense transfers and monthly spending.',
    excelFormula: '= Raw Online Balance + Expense Allotted - (Expenses - Settled)',
    formula: 'Online Balance = Raw Online Balance + Expense Allotted - (Total Expenses - Settled Expenses)',
    variables: [
      { name: 'Raw Online Balance', desc: 'Sum of Self accounts of subtype "online"' },
      { name: 'Expense Allotted', desc: 'Sum of Self accounts of subtype "expense"' },
      { name: 'Total Expenses', desc: 'Expenses tracked in the system for the current selected month' }
    ],
    getLiveCalculation: (data) => {
      const rawOnline = data.rawOnlineBalance || 0
      const expAllot = data.expenseAllotted || 0
      const totalExp = data.totalExpenses || 0
      const settledExp = data.settledExpenses || 0
      const net = data.onlineBalance
      if (settledExp > 0) {
        return `${formatCurrency(rawOnline)} (Raw Online) + ${formatCurrency(expAllot)} (Expense Allotted) - [ ${formatCurrency(totalExp)} (Total Expenses) - ${formatCurrency(settledExp)} (Settled) ] = ${formatCurrency(net)}`
      }
      return `${formatCurrency(rawOnline)} (Raw Online) + ${formatCurrency(expAllot)} (Expense Allotted) - ${formatCurrency(totalExp)} (Total Expenses) = ${formatCurrency(net)}`
    }
  },
  bankBalance: {
    title: 'Other Banks Balance',
    description: 'The combined balance across your traditional bank accounts (e.g. savings, checking).',
    excelFormula: '= SUM(Self Accounts with subtype "bank")',
    formula: 'Other Banks Balance = Sum of cumulative balances of all Self accounts of subtype "bank"',
    variables: [
      { name: 'Bank Accounts', desc: 'Accounts representing institutional bank savings (e.g. SBI, HDFC)' }
    ],
    getLiveCalculation: (data) => {
      return `Bank Accounts Balance = ${formatCurrency(data.bankBalance)}`
    }
  },

  // --- CHARTS ---
  dailyExpenses: {
    title: 'Daily Expenses Chart',
    description: 'Aggregated sum of all expenses grouped by each calendar day.',
    excelFormula: '= SUMIFS(Expenses, Date, ChartDay)',
    formula: 'Daily Expense = Sum of expense amounts on a specific date',
    variables: [
      { name: 'Date Grouping', desc: 'All expenses logged under the same date are summed to create a single data point' }
    ],
    getLiveCalculation: (data) => {
      return `Total logged expenses this month: ${formatCurrency(data.totalExpenses)} across ${data.expenses?.length || 0} entries`
    }
  },
  spendingTrend: {
    title: 'Spending Trend Chart',
    description: 'Cumulative daily spending progression over the calendar days of the active month.',
    excelFormula: '= CUMSUM(Daily Expenses)',
    formula: 'Cumulative Spending = Running cumulative sum of daily expenses up to each day',
    variables: [
      { name: 'Daily Expenses', desc: 'Expenses recorded on each calendar day' },
      { name: 'Cumulative Total', desc: 'Running total of all expenses from the start of the month up to that day' }
    ],
    getLiveCalculation: (data) => {
      return `Total cumulative spend this month: ${formatCurrency(data.totalExpenses)} across ${data.expenses?.length || 0} entries`
    }
  },
  receivablesBreakdown: {
    title: 'Receivables Breakdown',
    description: 'The proportional breakdown of who owes you what percentage of your total receivables.',
    excelFormula: '= Account Balance / Total Receivables',
    formula: 'Percentage = (Individual Account Balance / Total Receivables) * 100',
    variables: [
      { name: 'Individual Account Balance', desc: 'Current balance of a specific receivable account' },
      { name: 'Total Receivables', desc: 'Sum of all receivable accounts combined' }
    ],
    getLiveCalculation: (data) => {
      if (!data.receivables || data.receivables.length === 0) return 'No receivables'
      const sample = data.receivables[0]
      const percentage = data.totalReceivables > 0 ? (sample.balance / data.totalReceivables) * 100 : 0
      return `Example (${sample.name}): ${formatCurrency(sample.balance)} / ${formatCurrency(data.totalReceivables)} = ${percentage.toFixed(1)}%`
    }
  },

  // --- EXPENSE METRICS ---
  totalExpenses: {
    title: 'Total Spent',
    description: 'The sum of all expenses logged in the current selected month.',
    excelFormula: '= SUM(Current Month Expenses)',
    formula: 'Total Spent = Sum of all expense amounts logged for the active month',
    variables: [
      { name: 'Expense Amount', desc: 'The cost value of each individual logged item' }
    ],
    getLiveCalculation: (data) => {
      return `Sum of all expense rows = ${formatCurrency(data.totalExpenses)}`
    }
  },
  perDayAvg: {
    title: 'Per Day Average',
    description: 'Average daily spending computed only over the days that have recorded expenses.',
    excelFormula: '= Total Spent / COUNTUNIQUE(Expense Dates)',
    formula: 'Per Day Average = Total Spent / Days Tracked',
    variables: [
      { name: 'Total Spent', desc: 'Sum of all expenses in the month' },
      { name: 'Days Tracked', desc: 'Number of unique days on which you recorded expenses' }
    ],
    getLiveCalculation: (data) => {
      const avg = data.daysTracked > 0 ? data.totalExpenses / data.daysTracked : 0
      return `${formatCurrency(data.totalExpenses)} (Total Spent) / ${data.daysTracked} (Days Tracked) = ${formatCurrency(avg)}/day`
    }
  },
  daysTracked: {
    title: 'Days Tracked',
    description: 'The number of unique calendar days this month for which you have entered at least one expense.',
    excelFormula: '= COUNTUNIQUE(Expense Dates)',
    formula: 'Days Tracked = Count of unique dates in the expense logs for the current month',
    variables: [
      { name: 'Unique Date', desc: 'Any day containing one or more transactions is counted as 1 day' }
    ],
    getLiveCalculation: (data) => {
      return `Unique dates with expenses: ${data.daysTracked} days`
    }
  },
  monthEstimate: {
    title: 'Month Estimate',
    description: 'An extrapolation of your monthly expenses based on the current daily average and total calendar days in the month.',
    excelFormula: '= Per Day Average * Days In Month',
    formula: 'Month Estimate = Per Day Average * Calendar Days in Month',
    variables: [
      { name: 'Per Day Average', desc: 'Average expenditure per active day' },
      { name: 'Calendar Days', desc: 'Total days in this month (e.g. 28, 30, or 31)' }
    ],
    getLiveCalculation: (data) => {
      const daysInMonth = data.daysInMonth || 30
      const est = data.perDayAvg * daysInMonth
      return `${formatCurrency(data.perDayAvg)} (Daily Avg) * ${daysInMonth} (Days in Month) = ${formatCurrency(est)}`
    }
  },

  // --- ESTIMATE FINDER (EXCEL K45-K48) ---
  targetPerDayBudget: {
    title: 'Target Per Day Budget',
    description: 'A custom budget benchmark you define to compare your actual spending against.',
    excelFormula: 'Excel Cell K46 input value',
    formula: 'Target Per Day Budget = Custom user-defined value stored in settings',
    variables: [
      { name: 'Target Budget', desc: 'Benchmark daily spending threshold' }
    ],
    getLiveCalculation: (data) => {
      return `Target defined in settings: ${formatCurrency(data.customEstimatePerDay || 0)}/day`
    }
  },
  customEstimateTotal: {
    title: 'Custom Estimate Total',
    description: 'Your targeted total monthly budget based on your daily benchmark.',
    excelFormula: '= Target Per Day Budget (K46) * Days In Month',
    formula: 'Target Monthly Budget = Target Per Day Budget * Calendar Days in Month',
    variables: [
      { name: 'Target Per Day Budget', desc: 'Your benchmark daily limit' },
      { name: 'Calendar Days', desc: 'Total days in this month' }
    ],
    getLiveCalculation: (data) => {
      const target = data.customEstimatePerDay || 0
      const days = data.daysInMonth || 30
      return `${formatCurrency(target)} (Target/Day) * ${days} (Days in Month) = ${formatCurrency(target * days)}`
    }
  },
  overrun: {
    title: 'Overrun Analysis',
    description: 'The difference between your actual spending and your target budget for the active days tracked so far.',
    excelFormula: '= Total Spent - (Target Per Day Budget * Days Tracked)',
    formula: 'Overrun = Total Spent - (Target Per Day Budget * Days Tracked)',
    variables: [
      { name: 'Total Spent', desc: 'Sum of expenses recorded this month' },
      { name: 'Target Per Day Budget', desc: 'Your benchmark daily budget' },
      { name: 'Days Tracked', desc: 'Number of active days with expenses logged' }
    ],
    getLiveCalculation: (data) => {
      const spent = data.totalSpend || 0
      const target = data.customEstimatePerDay || 0
      const days = data.uniqueDays || 0
      const overrunVal = spent - (target * days)
      return `${formatCurrency(spent)} (Spent) - (${formatCurrency(target)}/day * ${days} days) = ${formatCurrency(overrunVal)}`
    }
  },

  // --- ACCOUNTS PAGE ---
  accountsTabSummary: {
    title: 'Accounts Tab Summary',
    description: 'The sum of all balances belonging to accounts displayed under the active tab.',
    excelFormula: '= SUM(Filtered Accounts Balances)',
    formula: 'Tab Balance = Sum of balances of all accounts matching the selected type ("Receivable", "Payable", or "Self")',
    variables: [
      { name: 'Account Balance', desc: 'The net sum of all transaction entries for that specific account' }
    ],
    getLiveCalculation: (data) => {
      return `Total for "${data.tabName}" accounts = ${formatCurrency(data.totalBalance)}`
    }
  },
  accountBalance: {
    title: 'Account Net Balance',
    description: 'The overall net balance computed by summing up all historical transactions for this account.',
    excelFormula: '= SUM(All Transactions for Account)',
    formula: 'Account Balance = Sum of all transactions (credits positive, debits negative)',
    variables: [
      { name: 'Transaction Amount', desc: 'Positive values represent credits/increases, negative values represent debits/decreases' }
    ],
    getLiveCalculation: (data) => {
      return `Sum of ${data.txnCount || 0} transactions for "${data.accountName}" = ${formatCurrency(data.balance)}`
    }
  },

  // --- VERIFICATION PAGE ---
  totalAssetsVerification: {
    title: 'Total Assets',
    description: 'Your combined assets comprising all outstanding receivables and your self-managed funds.',
    excelFormula: '= Total Receivables + Self Accounts Total Balance',
    formula: 'Total Assets = Total Receivables + (Cash + Online + Bank Balance)',
    variables: [
      { name: 'Total Receivables', desc: 'Total money owed to you' },
      { name: 'Self Balance', desc: 'Sum of Cash, Online, and Bank balances' }
    ],
    getLiveCalculation: (data) => {
      const assets = data.totalReceivables + data.cashBalance + data.onlineBalance + data.bankBalance
      return `${formatCurrency(data.totalReceivables)} (Receivables) + (${formatCurrency(data.cashBalance)} Cash + ${formatCurrency(data.onlineBalance)} Online + ${formatCurrency(data.bankBalance)} Bank) = ${formatCurrency(assets)}`
    }
  },
  totalLiabilitiesVerification: {
    title: 'Total Liabilities',
    description: 'All financial obligations you owe to other accounts/people.',
    excelFormula: '= SUM(Payable Accounts)',
    formula: 'Total Liabilities = Sum of all Payable accounts',
    variables: [
      { name: 'Payables', desc: 'The amount you owe to other people' }
    ],
    getLiveCalculation: (data) => {
      return `Total Liabilities = ${formatCurrency(data.totalPayables)}`
    }
  },
  onlineAccountsRawVerification: {
    title: 'Online Accounts Raw',
    description: 'The sum of your online account balances prior to adjusting for allotted expenses and actual spending.',
    excelFormula: '= SUM(Self accounts excluding Cash, Bank, Expense)',
    formula: 'Online Raw = Sum of balances of self accounts excluding "cash", "bank", and "expense/expence" in the name',
    variables: [
      { name: 'Self Accounts Raw', desc: 'Initial balances in Paytm, GPay, wallet, etc.' }
    ],
    getLiveCalculation: (data) => {
      return `Raw Online Balance = ${formatCurrency(data.rawOnlineBalance)}`
    }
  },
  expenseAllottedVerification: {
    title: 'Expense Allotted',
    description: 'Funds specifically designated or transferred for expense tracking purposes.',
    excelFormula: '= SUM(Self accounts with "expense" or "expence" in name)',
    formula: 'Expense Allotted = Sum of self accounts designated as expense accounts',
    variables: [
      { name: 'Expense designated accounts', desc: 'Accounts used to store budget allocated for expenses' }
    ],
    getLiveCalculation: (data) => {
      return `Allotted Expenses Balance = ${formatCurrency(data.expenseAllotted)}`
    }
  },
  totalExpensesCumulativeVerification: {
    title: 'Total Expenses (Cumulative)',
    description: 'All-time cumulative expenses tracked in the system up to the current month, which reduces your available online balance.',
    excelFormula: '= SUM(Expenses up to current month)',
    formula: 'Cumulative Expenses = Sum of all expense entries up to the active month',
    variables: [
      { name: 'Expense Logs', desc: 'All logged daily spend entries up to the current month' }
    ],
    getLiveCalculation: (data) => {
      return `Cumulative Expenses = ${formatCurrency(data.totalExpensesUpTo)}`
    }
  },
  onlineBalanceCheck: {
    title: 'Online Balance Check',
    description: 'Fault detection for your online balance. Compares system-calculated online balance against your manually counted statement.',
    excelFormula: 'Excel Row 31: IF(ROUND(Calculated, 2) = ROUND(Manual, 2), "No Fault", "Fault")',
    formula: 'Online Fault (Difference) = Calculated Online Balance - Manual Online Input',
    variables: [
      { name: 'Calculated Online', desc: 'System online balance (Raw + Allotted - Spent)' },
      { name: 'Manual Online', desc: 'Your physically verified online balance input' }
    ],
    getLiveCalculation: (data) => {
      const calc = data.onlineBalance || 0
      const manual = data.manualOnlineVal || 0
      const diff = calc - manual
      const isVerified = Math.abs(diff) < 0.01
      return `System calculated ${formatCurrency(calc)} vs Manual input ${formatCurrency(manual)} | Difference: ${formatCurrency(diff)} (${isVerified ? 'No Fault' : 'Fault'})`
    }
  },
  cashBalanceCheck: {
    title: 'Cash Balance Check',
    description: 'Fault detection for your cash balance. Compares system-calculated cash balance against your manually counted physical cash.',
    excelFormula: 'Excel Row 54-55: IF(ROUND(Calculated, 2) = ROUND(Manual, 2), "No Fault", "Fault")',
    formula: 'Cash Fault (Difference) = Calculated Cash Balance - Manual Cash Input',
    variables: [
      { name: 'Calculated Cash', desc: 'System cash balance (cumulative cash transactions)' },
      { name: 'Manual Cash', desc: 'Your manually counted physical cash input' }
    ],
    getLiveCalculation: (data) => {
      const calc = data.cashBalance || 0
      const manual = data.manualCashVal || 0
      const diff = calc - manual
      const isVerified = Math.abs(diff) < 0.01
      return `System calculated ${formatCurrency(calc)} vs Manual input ${formatCurrency(manual)} | Difference: ${formatCurrency(diff)} (${isVerified ? 'No Fault' : 'Fault'})`
    }
  }
}
