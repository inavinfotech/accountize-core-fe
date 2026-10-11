import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getYearlyReportData } from '../lib/db'
import { getAvailableFinancialYears, formatCurrency, formatMonthName, getCurrentMonth } from '../lib/utils'
import { exportYearlyReportPDF } from '../lib/pdfExport'
import { analytics } from '../lib/analytics'
import {
  X, Calendar, TrendingUp, TrendingDown, Download, FileSpreadsheet,
  ShieldCheck, ShieldAlert, RefreshCw, Wallet, Banknote, CreditCard,
  ArrowUpRight, ArrowDownRight, Layers, BarChart2, CheckCircle2, AlertCircle
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

export default function YearlyReportModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [selectedFYStartYear, setSelectedFYStartYear] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChartTab, setActiveChartTab] = useState('trajectory') // 'trajectory' | 'expenses' | 'composition'
  const [refreshKey, setRefreshKey] = useState(0)

  // 1. Determine available FYs based on account creation date
  const { creationMonth, availableFYs } = useMemo(() => {
    return getAvailableFinancialYears(user?.created_at, getCurrentMonth())
  }, [user?.created_at])

  // Set default selected FY to current (first in list) on initial open
  useEffect(() => {
    if (availableFYs.length > 0 && selectedFYStartYear === null) {
      setSelectedFYStartYear(availableFYs[0].startYear)
    }
  }, [availableFYs, selectedFYStartYear])

  // 2. Fetch Yearly Report Data
  const loadData = useCallback(async () => {
    if (selectedFYStartYear === null) return
    setLoading(true)
    try {
      const data = await getYearlyReportData(selectedFYStartYear, creationMonth)
      setReportData(data)
    } catch (err) {
      console.error('Failed to load yearly report data:', err)
      analytics.logError(err, 'YearlyReport:LoadData')
    } finally {
      setLoading(false)
    }
  }, [selectedFYStartYear, creationMonth])

  useEffect(() => {
    if (isOpen && selectedFYStartYear !== null) {
      loadData()
      analytics.track('view_yearly_report', { fyStartYear: selectedFYStartYear })
    }
  }, [isOpen, selectedFYStartYear, loadData, refreshKey])

  // 3. Prepare Chart Data
  const chartData = useMemo(() => {
    if (!reportData?.monthsData) return []
    return reportData.monthsData.map(m => ({
      monthLabel: formatMonthName(m.month, true),
      fullMonth: m.month,
      physicalMoneyAvailable: m.physicalMoneyAvailable ?? m.selfTotal ?? ((m.cashBalance || 0) + (m.onlineBalance || 0) + (m.bankBalance || 0)),
      availableBalance: m.availableBalance,
      totalAssets: m.totalAssets,
      totalLiabilities: m.totalPayables,
      totalExpenses: m.totalExpenses,
      cashBalance: m.cashBalance,
      onlineBalance: m.onlineBalance,
      bankBalance: m.bankBalance,
    }))
  }, [reportData])

  // 4. CSV Export Handler
  const handleExportCSV = () => {
    if (!reportData || !reportData.monthsData.length) return
    const headers = [
      'Month',
      'Total Assets (INR)',
      'Total Liabilities (INR)',
      'Net Available Balance (INR)',
      'Online Balance (INR)',
      'Cash Balance (INR)',
      'Monthly Expenses (INR)',
      'Verification Status',
      'Fault Amount (INR)',
      'MoM Change (INR)',
      'MoM Change (%)'
    ]

    const rows = reportData.monthsData.map(m => [
      `"${formatMonthName(m.month)}"`,
      m.totalAssets.toFixed(2),
      m.totalPayables.toFixed(2),
      m.availableBalance.toFixed(2),
      m.onlineBalance.toFixed(2),
      m.cashBalance.toFixed(2),
      m.totalExpenses.toFixed(2),
      m.isVerified ? '"Verified"' : (m.faultAmount > 0 ? '"Fault"' : '"Unverified"'),
      m.faultAmount.toFixed(2),
      m.momChange.toFixed(2),
      `${m.momChangePercent.toFixed(1)}%`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Accountize_${reportData.fyLabel.replace(/\s+/g, '_')}_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    analytics.track('export_csv_yearly_report', { fy: reportData.fyLabel })
  }

  // 5. PDF Export Handler
  const handleExportPDF = () => {
    if (!reportData) return
    exportYearlyReportPDF(reportData.fyLabel, reportData, user)
  }

  if (!isOpen) return null

  const totals = reportData?.annualTotals || {}
  const quarters = reportData?.quarterlyData || []
  const months = reportData?.monthsData || []

  return (
    <div className="yearly-modal-backdrop" onClick={onClose}>
      <div className="yearly-modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Top Header Bar */}
        <div className="yearly-modal-header">
          <div className="yearly-modal-title-wrap">
            <div className="yearly-modal-icon">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="yearly-modal-title">Financial Year Report</h2>
              <p className="yearly-modal-subtitle">
                Comprehensive multi-month analytics from account creation ({formatMonthName(creationMonth)})
              </p>
            </div>
          </div>

          <div className="yearly-modal-actions">
            <div className="yearly-actions-row-top">
              {/* Financial Year Selector */}
              <div className="yearly-fy-select-wrap">
                <Calendar size={15} color="var(--accent-primary)" />
                <select
                  id="yearly-fy-selector"
                  value={selectedFYStartYear || ''}
                  onChange={e => setSelectedFYStartYear(Number(e.target.value))}
                  className="yearly-fy-select"
                  aria-label="Select Financial Year"
                >
                  {availableFYs.map(fy => (
                    <option key={fy.startYear} value={fy.startYear}>
                      {fy.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                className="yearly-btn-icon"
                onClick={() => setRefreshKey(k => k + 1)}
                title="Refresh Report Data"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
              </button>

              {/* Close Button on Mobile (visible in top row) */}
              <button
                type="button"
                className="yearly-modal-close-btn"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="yearly-actions-row-bottom">
              {/* CSV Export */}
              <button
                type="button"
                className="yearly-btn-secondary"
                onClick={handleExportCSV}
                disabled={loading || !months.length}
                title="Export as CSV spreadsheet"
              >
                <FileSpreadsheet size={15} />
                <span>CSV</span>
              </button>

              {/* PDF Statement */}
              <button
                type="button"
                className="yearly-btn-primary"
                onClick={handleExportPDF}
                disabled={loading || !months.length}
                title="Export branded PDF statement"
              >
                <Download size={15} />
                <span>PDF Statement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="yearly-modal-body">
          {loading ? (
            <div className="yearly-loading-state">
              <div className="auth-spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
              <p>Aggregating Financial Year data across all ledgers...</p>
            </div>
          ) : months.length === 0 ? (
            <div className="yearly-empty-state">
              <AlertCircle size={48} color="var(--amber)" />
              <h3>No Ledger Data Recorded in this FY</h3>
              <p>Your account was established in {formatMonthName(creationMonth)}. No transactions or expenses found for the selected financial year period.</p>
            </div>
          ) : (
            <>
              {/* ── Annual Summary KPI Cards ── */}
              <div className="yearly-kpis-grid">
                
                {/* Ending Net Balance */}
                <div className="yearly-kpi-card accent">
                  <div className="yearly-kpi-top">
                    <span className="yearly-kpi-label">Ending Net Balance</span>
                    <div className="yearly-kpi-badge accent">
                      <Wallet size={14} />
                    </div>
                  </div>
                  <div className="yearly-kpi-val">{formatCurrency(totals.endingAvailableBalance)}</div>
                  <div className="yearly-kpi-footer">
                    {totals.netAnnualChange >= 0 ? (
                      <span className="kpi-trend positive">
                        <ArrowUpRight size={13} /> +{formatCurrency(totals.netAnnualChange)} ({totals.netAnnualChangePercent >= 0 ? '+' : ''}{totals.netAnnualChangePercent.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="kpi-trend negative">
                        <ArrowDownRight size={13} /> -{formatCurrency(Math.abs(totals.netAnnualChange))} ({totals.netAnnualChangePercent.toFixed(1)}%)
                      </span>
                    )}
                    <span className="kpi-context">FY net delta</span>
                  </div>
                </div>

                {/* Ending Total Assets */}
                <div className="yearly-kpi-card green">
                  <div className="yearly-kpi-top">
                    <span className="yearly-kpi-label">Ending Total Assets</span>
                    <div className="yearly-kpi-badge green">
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <div className="yearly-kpi-val">{formatCurrency(totals.endingTotalAssets)}</div>
                  <div className="yearly-kpi-footer">
                    <span className="kpi-context">Receivables + Self Accounts</span>
                  </div>
                </div>

                {/* Ending Liabilities */}
                <div className="yearly-kpi-card red">
                  <div className="yearly-kpi-top">
                    <span className="yearly-kpi-label">Ending Liabilities</span>
                    <div className="yearly-kpi-badge red">
                      <TrendingDown size={14} />
                    </div>
                  </div>
                  <div className="yearly-kpi-val">{formatCurrency(totals.endingTotalLiabilities)}</div>
                  <div className="yearly-kpi-footer">
                    <span className="kpi-context">Total Payables Owed</span>
                  </div>
                </div>

                {/* Total Annual Expenses */}
                <div className="yearly-kpi-card orange">
                  <div className="yearly-kpi-top">
                    <span className="yearly-kpi-label">Total FY Expenses</span>
                    <div className="yearly-kpi-badge orange">
                      <CreditCard size={14} />
                    </div>
                  </div>
                  <div className="yearly-kpi-val">{formatCurrency(totals.totalAnnualExpenses)}</div>
                  <div className="yearly-kpi-footer">
                    <span className="kpi-context">Avg {formatCurrency(totals.avgMonthlyExpense)}/mo ({totals.totalMonths} mos)</span>
                  </div>
                </div>

                {/* Verification Health Rate */}
                <div className="yearly-kpi-card purple">
                  <div className="yearly-kpi-top">
                    <span className="yearly-kpi-label">Audit & Verification</span>
                    <div className="yearly-kpi-badge purple">
                      <ShieldCheck size={14} />
                    </div>
                  </div>
                  <div className="yearly-kpi-val">{Math.round(totals.verificationRate)}% Verified</div>
                  <div className="yearly-kpi-footer">
                    {totals.totalFaultAmount > 0 ? (
                      <span className="kpi-trend negative">
                        <AlertCircle size={13} /> {formatCurrency(totals.totalFaultAmount)} total fault
                      </span>
                    ) : (
                      <span className="kpi-trend positive">
                        <CheckCircle2 size={13} /> {totals.verifiedMonthsCount}/{totals.totalMonths} months clean
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* ── Visual Analytics Section ── */}
              <div className="yearly-chart-section">
                <div className="yearly-chart-header">
                  <div className="yearly-chart-title">
                    <BarChart2 size={18} color="var(--accent-primary)" />
                    <h3>Month-by-Month Trajectory & Trends</h3>
                  </div>

                  {/* Chart Tabs */}
                  <div className="yearly-chart-tabs">
                    <button
                      type="button"
                      className={`yearly-chart-tab ${activeChartTab === 'trajectory' ? 'active' : ''}`}
                      onClick={() => setActiveChartTab('trajectory')}
                    >
                      <Layers size={14} />
                      <span>Physical Money & Wealth</span>
                    </button>
                    <button
                      type="button"
                      className={`yearly-chart-tab ${activeChartTab === 'expenses' ? 'active' : ''}`}
                      onClick={() => setActiveChartTab('expenses')}
                    >
                      <CreditCard size={14} />
                      <span>Expenses Velocity</span>
                    </button>
                    <button
                      type="button"
                      className={`yearly-chart-tab ${activeChartTab === 'composition' ? 'active' : ''}`}
                      onClick={() => setActiveChartTab('composition')}
                    >
                      <Banknote size={14} />
                      <span>Cash vs Online</span>
                    </button>
                  </div>
                </div>

                {/* Recharts Container */}
                <div className="yearly-chart-body">
                  <ResponsiveContainer width="100%" height={300}>
                    {activeChartTab === 'trajectory' ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value, name) => [
                            formatCurrency(value),
                            name === 'physicalMoneyAvailable' ? 'Total Physical Money Available' :
                            name === 'availableBalance' ? 'Net Available Balance' :
                            name === 'totalAssets' ? 'Total Assets' : 'Total Liabilities'
                          ]}
                          labelFormatter={(label) => `Month: ${label}`}
                          contentStyle={{
                            background: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                            fontSize: '0.8rem'
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          formatter={(val) => 
                            val === 'physicalMoneyAvailable' ? 'Total Physical Money Available' :
                            val === 'availableBalance' ? 'Net Available Balance' : 
                            val === 'totalAssets' ? 'Total Assets' : 'Total Liabilities'
                          }
                        />
                        <Area type="monotone" dataKey="totalAssets" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAssets)" />
                        <Area type="monotone" dataKey="physicalMoneyAvailable" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBalance)" />
                        <Area type="monotone" dataKey="totalLiabilities" stroke="#ef4444" strokeWidth={2} fillOpacity={0.1} fill="#ef4444" />
                      </AreaChart>
                    ) : activeChartTab === 'expenses' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value), 'Monthly Expenses']}
                          labelFormatter={(label) => `Month: ${label}`}
                          contentStyle={{
                            background: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                            fontSize: '0.8rem'
                          }}
                        />
                        <Legend verticalAlign="top" height={36} formatter={() => 'Total Monthly Expenses'} />
                        <Bar dataKey="totalExpenses" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    ) : (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value, name) => [
                            formatCurrency(value),
                            name === 'onlineBalance' ? 'Online / Bank' :
                            name === 'cashBalance' ? 'Cash in Hand' : 'Bank Balance'
                          ]}
                          labelFormatter={(label) => `Month: ${label}`}
                          contentStyle={{
                            background: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                            fontSize: '0.8rem'
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          formatter={(val) => val === 'onlineBalance' ? 'Online Money' : val === 'cashBalance' ? 'Cash in Hand' : 'Bank'}
                        />
                        <Bar dataKey="onlineBalance" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={48} />
                        <Bar dataKey="cashBalance" stackId="a" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Quarterly Summary Breakdown ── */}
              {quarters.length > 0 && (
                <div className="yearly-quarter-section">
                  <h3 className="yearly-section-heading">Quarterly Performance Breakdown</h3>
                  <div className="yearly-quarter-grid">
                    {quarters.map(q => (
                      <div key={q.key} className="yearly-quarter-card">
                        <div className="quarter-card-header">
                          <span className="quarter-badge">{q.key}</span>
                          <span className="quarter-name">{q.name}</span>
                          <span className="quarter-count">{q.monthCount} mo{q.monthCount > 1 ? 's' : ''}</span>
                        </div>
                        <div className="quarter-card-body">
                          <div className="quarter-stat-row">
                            <span className="stat-label">Ending Balance</span>
                            <span className="stat-val highlight">{formatCurrency(q.endingBalance)}</span>
                          </div>
                          <div className="quarter-stat-row">
                            <span className="stat-label">Quarter Expenses</span>
                            <span className="stat-val red">{formatCurrency(q.totalExpenses)}</span>
                          </div>
                          <div className="quarter-stat-row">
                            <span className="stat-label">Total Assets</span>
                            <span className="stat-val green">{formatCurrency(q.endingAssets)}</span>
                          </div>
                          <div className="quarter-stat-row">
                            <span className="stat-label">Liabilities</span>
                            <span className="stat-val">{formatCurrency(q.endingLiabilities)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Detailed Month-by-Month Comparison Table ── */}
              <div className="yearly-table-section">
                <h3 className="yearly-section-heading">Month-by-Month Comparative Ledger</h3>
                <div className="yearly-table-wrapper">
                  <table className="yearly-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="num">Total Assets</th>
                        <th className="num">Liabilities</th>
                        <th className="num">Net Balance</th>
                        <th className="num">Online</th>
                        <th className="num">Cash</th>
                        <th className="num">Expenses</th>
                        <th className="center">Status</th>
                        <th className="num">MoM Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map(m => (
                        <tr key={m.month}>
                          <td className="month-name-cell">
                            <strong>{formatMonthName(m.month)}</strong>
                            <span className="sub-tag">{m.month}</span>
                          </td>
                          <td className="num green">{formatCurrency(m.totalAssets)}</td>
                          <td className="num red">{formatCurrency(m.totalPayables)}</td>
                          <td className="num bold">{formatCurrency(m.availableBalance)}</td>
                          <td className="num">{formatCurrency(m.onlineBalance)}</td>
                          <td className="num">{formatCurrency(m.cashBalance)}</td>
                          <td className="num orange">{formatCurrency(m.totalExpenses)}</td>
                          <td className="center">
                            {m.isVerified ? (
                              <span className="status-pill verified">
                                <CheckCircle2 size={12} />
                                <span>Verified</span>
                              </span>
                            ) : m.faultAmount > 0 ? (
                              <span className="status-pill fault" title={`Discrepancy: ${formatCurrency(m.faultAmount)}`}>
                                <ShieldAlert size={12} />
                                <span>Fault ({formatCurrency(m.faultAmount)})</span>
                              </span>
                            ) : (
                              <span className="status-pill unverified">
                                <span>Unverified</span>
                              </span>
                            )}
                          </td>
                          <td className="num">
                            {m.momChange === 0 ? (
                              <span className="mom-neutral">-</span>
                            ) : m.momChange > 0 ? (
                              <span className="mom-badge positive">
                                +{formatCurrency(m.momChange)} (+{m.momChangePercent.toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="mom-badge negative">
                                -{formatCurrency(Math.abs(m.momChange))} ({m.momChangePercent.toFixed(1)}%)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>

      </div>
    </div>
  )
}
